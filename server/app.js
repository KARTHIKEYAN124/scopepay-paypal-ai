import express from "express";
import { randomUUID } from "node:crypto";
import {
  briefSchema,
  reviewSchema,
  budgetCents,
  allocate,
  amountString,
  verifyPayment,
} from "./domain.js";

export function createApp({ config, store, providers }) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    const host = req.headers.host?.split(":")[0];
    if (!["localhost", "127.0.0.1"].includes(host))
      return res
        .status(403)
        .json({ error: "This prototype only accepts local connections." });
    if (
      req.headers.origin &&
      !config.allowedOrigins.includes(req.headers.origin)
    )
      return res.status(403).json({ error: "Origin not allowed." });
    if (req.method === "POST" && !req.is("application/json"))
      return res.status(415).json({ error: "JSON requests only." });
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  async function get(id) {
    const project = await store.get(id);
    if (!project)
      throw Object.assign(new Error("Project not found."), { status: 404 });
    return project;
  }
  const paypalConfigured = () =>
    Boolean(config.paypalClientId && config.paypalSecret);
  app.get("/api/status", async (req, res) =>
    res.json({
      ollama: await providers.health(),
      paypal: { configured: paypalConfigured(), environment: "sandbox" },
    }),
  );
  app.get("/api/projects", async (req, res) => res.json(await store.list()));
  app.get("/api/projects/:id", async (req, res) =>
    res.json(await get(req.params.id)),
  );
  let generating = false;
  app.post("/api/proposals", async (req, res) => {
    const input = briefSchema.parse(req.body);
    let totalCents;
    try {
      totalCents = budgetCents(input.budget);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    if (generating)
      return res.status(429).json({
        error: "Another proposal is generating. Please wait for it to finish.",
      });
    generating = true;
    try {
      const scope = await providers.generate(input);
      const percentages = [20, 50, 30];
      const amounts = allocate(totalCents, percentages);
      const project = {
        id: randomUUID(),
        client: input.client,
        brief: input.brief,
        totalCents,
        currency: "USD",
        createdAt: new Date().toISOString(),
        state: "draft",
        source: config.aiProvider || "ollama",
        model: config.model,
        ...scope,
        milestones: scope.milestones.map((m, i) => ({
          ...m,
          percent: percentages[i],
          amountCents: amounts[i],
          payment: null,
          order: null,
        })),
      };
      await store.put(project);
      res.status(201).json(project);
    } finally {
      generating = false;
    }
  });
  app.post("/api/projects/:id/approve", async (req, res) => {
    const review = reviewSchema.parse(req.body);
    const project = await store.locked(req.params.id, async () => {
      const existing = await get(req.params.id);
      if (existing.state !== "draft")
        throw Object.assign(
          new Error(
            "This proposal is already approved. Create a new proposal to change the scope.",
          ),
          { status: 409 },
        );
      const amounts = allocate(
        existing.totalCents,
        review.milestones.map((m) => m.percent),
      );
      const approved = {
        ...existing,
        ...review,
        state: "approved",
        approvedAt: new Date().toISOString(),
        milestones: review.milestones.map((m, i) => ({
          ...m,
          amountCents: amounts[i],
          payment: null,
          order: null,
        })),
      };
      await store.put(approved);
      return approved;
    });
    res.json(project);
  });
  app.post("/api/projects/:id/milestones/:index/order", async (req, res) => {
    const result = await store.locked(req.params.id, async () => {
      const project = await get(req.params.id),
        index = Number(req.params.index),
        milestone = project.milestones[index];
      if (!Number.isInteger(index) || index < 0 || !milestone)
        throw Object.assign(new Error("Milestone not found."), { status: 404 });
      if (project.state !== "approved")
        throw Object.assign(
          new Error("Review and approve the scope before collecting payment."),
          { status: 409 },
        );
      if (milestone.payment)
        throw Object.assign(new Error("This milestone is already paid."), {
          status: 409,
        });
      if (req.body?.accepted !== true)
        throw Object.assign(
          new Error(
            "Confirm acceptance of the milestone criteria before checkout.",
          ),
          { status: 400 },
        );
      if (milestone.order) {
        const existing = await providers.paypal(
          `/v2/checkout/orders/${milestone.order.id}`,
        );
        if (existing.status === "COMPLETED")
          throw Object.assign(
            new Error(
              "Payment is captured. Use Check payment status to reconcile the receipt.",
            ),
            { status: 409 },
          );
        if (
          ["CREATED", "APPROVED", "PAYER_ACTION_REQUIRED"].includes(
            existing.status,
          )
        )
          return milestone.order;
      }
      const attempt = milestone.orderAttempt || randomUUID();
      // Persist idempotency key before contacting PayPal, including on timeouts/restarts.
      await store.put({
        ...project,
        milestones: project.milestones.map((m, i) =>
          i === index ? { ...m, orderAttempt: attempt } : m,
        ),
      });
      const returnUrl = `${config.appUrl}/?project=${project.id}&milestone=${index}`;
      const order = await providers.paypal("/v2/checkout/orders", {
        method: "POST",
        requestId: attempt,
        body: {
          intent: "CAPTURE",
          purchase_units: [
            {
              custom_id: `${project.id}:${index}`,
              description: `${project.title}: ${milestone.title}`.slice(0, 127),
              amount: {
                currency_code: "USD",
                value: amountString(milestone.amountCents),
              },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: "ScopePay",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                return_url: returnUrl,
                cancel_url: `${returnUrl}&cancelled=1`,
              },
            },
          },
        },
      });
      const approvalUrl = order.links?.find((l) =>
        ["payer-action", "approve"].includes(l.rel),
      )?.href;
      if (
        !order.id ||
        !approvalUrl ||
        new URL(approvalUrl).hostname !== "www.sandbox.paypal.com"
      )
        throw Object.assign(
          new Error("PayPal did not return a valid sandbox approval URL."),
          { status: 502 },
        );
      const pending = {
        id: order.id,
        approvalUrl,
        requestId: attempt,
        captureRequestId: randomUUID(),
      };
      const updated = await store.get(project.id);
      await store.put({
        ...updated,
        milestones: updated.milestones.map((m, i) =>
          i === index ? { ...m, order: pending, orderAttempt: null } : m,
        ),
      });
      return pending;
    });
    res.json(result);
  });
  app.post("/api/projects/:id/milestones/:index/capture", async (req, res) => {
    const project = await store.locked(req.params.id, async () => {
      const existing = await get(req.params.id),
        index = Number(req.params.index),
        milestone = existing.milestones[index];
      if (!Number.isInteger(index) || index < 0 || !milestone)
        throw Object.assign(new Error("Milestone not found."), { status: 404 });
      if (
        existing.state !== "approved" ||
        !milestone.order ||
        req.body.orderId !== milestone.order.id
      )
        throw Object.assign(
          new Error("Order does not belong to this milestone."),
          { status: 409 },
        );
      if (milestone.payment) return existing;
      // Never capture based solely on a browser callback. Check the stored order with PayPal.
      let order = await providers.paypal(
        `/v2/checkout/orders/${milestone.order.id}`,
      );
      const unit = order.purchase_units?.[0];
      if (
        unit?.custom_id !== `${existing.id}:${index}` ||
        unit.amount?.value !== amountString(milestone.amountCents) ||
        unit.amount?.currency_code !== "USD" ||
        order.purchase_units.length !== 1
      )
        throw Object.assign(
          new Error("PayPal order amount or project reference does not match."),
          { status: 409 },
        );
      if (order.status !== "COMPLETED") {
        if (order.status !== "APPROVED")
          throw Object.assign(
            new Error("The buyer has not approved this PayPal payment yet."),
            { status: 409 },
          );
        order = await providers.paypal(
          `/v2/checkout/orders/${milestone.order.id}/capture`,
          {
            method: "POST",
            requestId: milestone.order.captureRequestId,
            body: {},
          },
        );
      }
      const payment = verifyPayment(order, existing, index);
      const paid = {
        ...existing,
        milestones: existing.milestones.map((m, i) =>
          i === index ? { ...m, payment } : m,
        ),
      };
      await store.put(paid);
      return paid;
    });
    res.json(project);
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  app.use((error, req, res, next) => {
    if (error.name === "ZodError")
      return res.status(400).json({
        error: error.issues
          .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
          .join(" "),
      });
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error("Request failed:", error.name);
    res.status(status).json({
      error:
        status === 500
          ? "The request could not be completed. Check the server and try again."
          : error.message,
    });
  });
  return app;
}
