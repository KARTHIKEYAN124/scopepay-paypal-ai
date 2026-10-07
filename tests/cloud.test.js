import test from "node:test";
import assert from "node:assert/strict";
import serverless from "serverless-http";
import { createCloudStore } from "../server/cloud-store.js";
import { createApp } from "../server/app.js";
import { createProviders } from "../server/providers.js";

function database() {
  const rows = new Map();
  const key = (p) => `${p.tableId}:${p.rowId}`;
  return {
    async getRow(p) {
      if (!rows.has(key(p))) throw { code: 404 };
      return structuredClone(rows.get(key(p)));
    },
    async createRow(p) {
      if (rows.has(key(p))) throw { code: 409 };
      rows.set(key(p), { $id: p.rowId, ...p.data });
    },
    async updateRow(p) {
      rows.set(key(p), { ...rows.get(key(p)), ...p.data });
    },
    async deleteRow(p) {
      rows.delete(key(p));
    },
    async listRows(p) {
      const owner = JSON.parse(p.queries[0]).values[0];
      return {
        rows: [...rows.entries()]
          .filter(
            ([k, r]) => k.startsWith(`${p.tableId}:`) && r.owner === owner,
          )
          .map(([, r]) => structuredClone(r)),
      };
    },
  };
}
test("cloud projects remain private across users and Function instances", async () => {
  const db = database(),
    a = createCloudStore(db, "scopepay", "a"),
    b = createCloudStore(db, "scopepay", "b");
  await a.put({ id: "project", createdAt: "2026-10-07", title: "Private" });
  assert.equal(
    (await createCloudStore(db, "scopepay", "a").get("project")).title,
    "Private",
  );
  assert.equal(await b.get("project"), undefined);
  assert.deepEqual(await b.list(), []);
  await assert.rejects(b.put({ id: "project", title: "Overwrite" }), {
    status: 404,
  });
  await assert.rejects(
    b.locked("project", async () => {}),
    { status: 404 },
  );
  assert.equal((await a.get("project")).title, "Private");
});
test("durable locks reject concurrent financial updates and release after failure", async () => {
  const db = database(),
    a = createCloudStore(db, "scopepay", "a"),
    other = createCloudStore(db, "scopepay", "a");
  await a.put({ id: "project", createdAt: "2026-10-07" });
  let release;
  const waiting = new Promise((r) => {
    release = r;
  });
  let entered;
  const started = new Promise((r) => {
    entered = r;
  });
  const first = a.locked("project", async () => {
    entered();
    await waiting;
  });
  await started;
  await assert.rejects(
    other.locked("project", async () => {}),
    { status: 409 },
  );
  release();
  await first;
  await assert.rejects(
    other.locked("project", async () => {
      throw new Error("provider failed");
    }),
    /provider failed/,
  );
  assert.equal(await a.locked("project", async () => "released"), "released");
});
test("Function adapter preserves Express JSON routes and async storage", async () => {
  const store = createCloudStore(database(), "scopepay", "a");
  await store.put({ id: "project", createdAt: "2026-10-07" });
  const handler = serverless(
    createApp({ config: { allowedOrigins: [] }, store, providers: {} }),
  );
  const invoke = (path) =>
    handler(
      {
        path,
        httpMethod: "GET",
        headers: { host: "localhost", "content-type": "application/json" },
        requestContext: { identity: { sourceIp: "127.0.0.1" } },
        body: "",
        isBase64Encoded: false,
      },
      {},
    );
  const response = await invoke("/api/projects/project");
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).id, "project");
  assert.equal((await invoke("/api/projects/missing")).statusCode, 404);
});
test("Groq uses a server-side key and schema, and reports free quota exhaustion", async () => {
  let body;
  const config = {
    aiProvider: "groq",
    groqKey: "test-server-secret",
    model: "openai/gpt-oss-20b",
  };
  const provider = createProviders(config, async (url, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-server-secret");
    body = JSON.parse(options.body);
    return { ok: false, status: 429 };
  });
  await assert.rejects(
    provider.generate({ client: "Test", brief: "Build a shop" }),
    { status: 429 },
  );
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.model, config.model);
  assert.equal((await provider.health()).ready, true);
  await assert.rejects(createProviders({ aiProvider: "groq" }).generate({}), {
    status: 503,
  });
});
