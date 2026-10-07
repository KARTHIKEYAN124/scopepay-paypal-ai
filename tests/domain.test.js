import test from "node:test";
import assert from "node:assert/strict";
import {
  allocate,
  budgetCents,
  reviewSchema,
  verifyPayment,
} from "../server/domain.js";

test("currency input preserves cents and rejects invalid budgets", () => {
  assert.equal(budgetCents("2400.01"), 240001);
  for (const value of ["-1", "2e3", "10.999", "0", "100001", "NaN"])
    assert.throws(() => budgetCents(value));
});
test("allocation conserves the entire budget including rounding cents", () => {
  assert.deepEqual(allocate(240001, [20, 50, 30]), [48000, 120000, 72001]);
  for (let total = 1000; total < 1100; total++)
    assert.equal(
      allocate(total, [33, 33, 34]).reduce((a, b) => a + b, 0),
      total,
    );
  assert.throws(() => allocate(240000, [20, 50, 20]));
});
const project = { id: "p1", milestones: [{ amountCents: 48000 }] };
const payment = () => ({
  status: "COMPLETED",
  purchase_units: [
    {
      custom_id: "p1:0",
      payments: {
        captures: [
          {
            id: "capture1",
            status: "COMPLETED",
            amount: { value: "480.00", currency_code: "USD" },
          },
        ],
      },
    },
  ],
});
test("capture verification requires completed payment, correct project, amount and currency", () => {
  assert.equal(verifyPayment(payment(), project, 0).captureId, "capture1");
  for (const mutate of [
    (o) => (o.status = "APPROVED"),
    (o) => (o.purchase_units[0].custom_id = "other:0"),
    (o) => (o.purchase_units[0].payments.captures[0].status = "PENDING"),
    (o) => (o.purchase_units[0].payments.captures[0].amount.value = "0.01"),
    (o) =>
      (o.purchase_units[0].payments.captures[0].amount.currency_code = "EUR"),
  ]) {
    const order = payment();
    mutate(order);
    assert.throws(() => verifyPayment(order, project, 0));
  }
});
