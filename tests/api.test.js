import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../server/app.js";
import { createStore } from "../server/store.js";
import { createProviders } from "../server/providers.js";

const scope = {
  title: "Acme online shop",
  summary: "Build the requested online shop and hand it over.",
  assumptions: ["Client provides product content."],
  exclusions: ["Ongoing maintenance."],
  milestones: ["Discovery", "Build", "Handoff"].map((title) => ({
    title,
    description: `Deliver ${title.toLowerCase()} work.`,
    criteria: [`${title} deliverables reviewed with the client.`],
  })),
};

async function harness(t, overrides = {}) {
  const store = await createStore();
  let createCount = 0,
    captureCount = 0,
    orderState = "CREATED",
    wrongAmount = false;
  const config = {
    model: "llama3.2:1b",
    appUrl: "http://127.0.0.1:5173",
    allowedOrigins: ["http://127.0.0.1:5173"],
    paypalClientId: "test",
    paypalSecret: "test",
  };
  const providers = {
    generate: async () => structuredClone(scope),
    health: async () => ({ ready: true }),
    async paypal(path, options = {}) {
      if (path === "/v2/checkout/orders") {
        createCount++;
        assert.equal(options.body.purchase_units[0].amount.value, "480.00");
        return {
          id: "ORDER1",
          links: [
            {
              rel: "payer-action",
              href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER1",
            },
          ],
        };
      }
      if (path.endsWith("/capture")) {
        captureCount++;
        orderState = "COMPLETED";
      }
      return {
        id: "ORDER1",
        status: orderState,
        purchase_units: [
          {
            custom_id: `${store.list()[0].id}:0`,
            amount: {
              value: wrongAmount ? "1.00" : "480.00",
              currency_code: "USD",
            },
            ...(orderState === "COMPLETED"
              ? {
                  payments: {
                    captures: [
                      {
                        id: "CAPTURE1",
                        status: "COMPLETED",
                        amount: { value: "480.00", currency_code: "USD" },
                      },
                    ],
                  },
                }
              : {}),
          },
        ],
      };
    },
    ...overrides,
  };
  const server = createApp({ config, store, providers }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (url, data, headers = {}) => {
    const res = await fetch(`${base}/api${url}`, {
      method: data === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...headers },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
    return { status: res.status, data: await res.json() };
  };
  return {
    store,
    request,
    approveOrder: () => (orderState = "APPROVED"),
    wrongAmount: () => (wrongAmount = true),
    counts: () => ({ createCount, captureCount }),
  };
}
async function proposal(h) {
  return (
    await h.request("/proposals", {
      client: "Acme",
      budget: "2400",
      brief: "Build a responsive online shop with catalog and checkout.",
    })
  ).data;
}
async function approve(h, p) {
  return h.request(`/projects/${p.id}/approve`, {
    ...scope,
    milestones: scope.milestones.map((m, i) => ({
      ...m,
      percent: [20, 50, 30][i],
    })),
  });
}

test("proposal lifecycle, concurrent checkout and repeated capture are idempotent", async (t) => {
  const h = await harness(t),
    p = await proposal(h);
  assert.equal(p.source, "ollama");
  assert.equal(p.totalCents, 240000);
  assert.equal(
    (
      await h.request(`/projects/${p.id}/milestones/0/order`, {
        accepted: true,
      })
    ).status,
    409,
  );
  assert.equal((await approve(h, p)).status, 200);
  assert.equal((await approve(h, p)).status, 409);
  const endpoint = `/projects/${p.id}/milestones/0/order`;
  assert.equal((await h.request(endpoint, { accepted: false })).status, 400);
  const orders = await Promise.all([
    h.request(endpoint, { accepted: true }),
    h.request(endpoint, { accepted: true }),
  ]);
  assert.ok(orders.every((o) => o.status === 200));
  assert.equal(h.counts().createCount, 1);
  const capture = `/projects/${p.id}/milestones/0/capture`;
  assert.equal(
    (await h.request(capture, { orderId: "UNRELATED" })).status,
    409,
  );
  assert.equal((await h.request(capture, { orderId: "ORDER1" })).status, 409);
  h.approveOrder();
  const captured = await Promise.all([
    h.request(capture, { orderId: "ORDER1" }),
    h.request(capture, { orderId: "ORDER1" }),
  ]);
  assert.ok(captured.every((c) => c.status === 200));
  assert.equal(h.counts().captureCount, 1);
  assert.equal(captured[0].data.milestones[0].payment.captureId, "CAPTURE1");
  assert.equal((await h.request(endpoint, { accepted: true })).status, 409);
});
test("capture refuses PayPal amount mismatch before moving money", async (t) => {
  const h = await harness(t),
    p = await proposal(h);
  await approve(h, p);
  await h.request(`/projects/${p.id}/milestones/0/order`, { accepted: true });
  h.approveOrder();
  h.wrongAmount();
  assert.equal(
    (
      await h.request(`/projects/${p.id}/milestones/0/capture`, {
        orderId: "ORDER1",
      })
    ).status,
    409,
  );
  assert.equal(h.counts().captureCount, 0);
  assert.equal(h.store.get(p.id).milestones[0].payment, null);
});
test("untrusted origins, malformed inputs and missing projects are rejected", async (t) => {
  const h = await harness(t);
  assert.equal(
    (
      await h.request("/projects", undefined, {
        Origin: "https://malicious.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await h.request("/proposals", {
        client: "A",
        budget: "-1",
        brief: "too short",
      })
    ).status,
    400,
  );
  assert.equal((await h.request("/projects/missing")).status, 404);
  const p = await proposal(h);
  assert.equal(
    (
      await h.request(`/projects/${p.id}/approve`, {
        ...scope,
        milestones: scope.milestones.map((m) => ({ ...m, percent: 20 })),
      })
    ).status,
    400,
  );
  assert.equal(h.store.get(p.id).state, "draft");
});
test("failed AI generation never creates a fake proposal", async (t) => {
  const h = await harness(t, {
    generate: async () => {
      throw Object.assign(new Error("Ollama offline"), { status: 503 });
    },
  });
  assert.equal(
    (
      await h.request("/proposals", {
        client: "A",
        budget: "2400",
        brief: "Build a responsive online shop with catalog and checkout.",
      })
    ).status,
    503,
  );
  assert.equal(h.store.list().length, 0);
});
test("provider sends schema-constrained local AI requests and sandbox-only payment requests", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/api/chat"))
      return {
        ok: true,
        json: async () => ({ message: { content: JSON.stringify(scope) } }),
      };
    if (url.endsWith("/token"))
      return {
        ok: true,
        json: async () => ({ access_token: "test-token", expires_in: 300 }),
      };
    return { ok: true, json: async () => ({ id: "ORDER" }) };
  };
  const providers = createProviders(
    {
      ollamaUrl: "http://127.0.0.1:11434",
      model: "llama3.2:1b",
      paypalClientId: "test",
      paypalSecret: "test",
    },
    fetcher,
  );
  assert.equal(
    (await providers.generate({ client: "Acme", brief: "Build a shop" })).title,
    scope.title,
  );
  const aiBody = JSON.parse(calls[0].options.body);
  assert.equal(aiBody.stream, false);
  assert.equal(aiBody.format.properties.milestones.minItems, 3);
  await providers.paypal("/v2/checkout/orders", {
    method: "POST",
    body: {},
    requestId: "unique-request",
  });
  assert.ok(
    calls
      .slice(1)
      .every((c) => c.url.startsWith("https://api-m.sandbox.paypal.com/")),
  );
  assert.equal(calls[2].options.headers["PayPal-Request-Id"], "unique-request");
});
