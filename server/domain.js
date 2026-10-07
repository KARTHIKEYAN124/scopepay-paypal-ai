import { z } from "zod";

const text = (max = 800) => z.string().trim().min(1).max(max);
export const briefSchema = z
  .object({
    client: text(100),
    budget: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/),
    brief: z.string().trim().min(30).max(6000),
  })
  .strict();
export const scopeSchema = z
  .object({
    title: text(120),
    summary: text(1000),
    assumptions: z.array(text(300)).min(1).max(5),
    exclusions: z.array(text(300)).min(1).max(5),
    milestones: z
      .array(
        z
          .object({
            title: text(120),
            description: text(600),
            criteria: z.array(text(300)).min(1).max(4),
          })
          .strict(),
      )
      .length(3),
  })
  .strict();
export const reviewSchema = z
  .object({
    title: text(120),
    summary: text(1000),
    assumptions: z.array(text(300)).min(1).max(5),
    exclusions: z.array(text(300)).min(1).max(5),
    milestones: z
      .array(
        z
          .object({
            title: text(120),
            description: text(600),
            criteria: z.array(text(300)).min(1).max(4),
            percent: z.number().int().min(1).max(98),
          })
          .strict(),
      )
      .length(3),
  })
  .strict()
  .refine(
    (v) => v.milestones.reduce((sum, m) => sum + m.percent, 0) === 100,
    "Milestone percentages must total 100.",
  );

export function budgetCents(value) {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid USD budget with up to two decimals.");
  const [dollars, decimals = ""] = value.split(".");
  const cents = Number(dollars) * 100 + Number(decimals.padEnd(2, "0"));
  if (cents < 1000 || cents > 10000000)
    throw new Error("Budget must be between $10 and $100,000.");
  return cents;
}
export const amountString = (cents) => (cents / 100).toFixed(2);
export function allocate(total, percentages) {
  if (
    !Number.isSafeInteger(total) ||
    total < 1 ||
    percentages.length !== 3 ||
    percentages.some((p) => !Number.isInteger(p) || p < 1) ||
    percentages.reduce((a, b) => a + b, 0) !== 100
  )
    throw new Error("Invalid payment allocation.");
  const amounts = percentages.map((p) => Math.floor((total * p) / 100));
  amounts[2] += total - amounts.reduce((a, b) => a + b, 0);
  return amounts;
}
export function verifyPayment(order, project, index) {
  const unit = order.purchase_units?.[0];
  const captures = unit?.payments?.captures;
  const expected = amountString(project.milestones[index].amountCents);
  if (
    order.status !== "COMPLETED" ||
    order.purchase_units?.length !== 1 ||
    unit.custom_id !== `${project.id}:${index}` ||
    captures?.length !== 1 ||
    captures[0].status !== "COMPLETED" ||
    captures[0].amount?.currency_code !== "USD" ||
    captures[0].amount?.value !== expected ||
    !captures[0].id
  )
    throw new Error(
      "PayPal payment is not completed or does not match this milestone.",
    );
  return {
    captureId: captures[0].id,
    paidAt: captures[0].create_time || new Date().toISOString(),
    amountCents: project.milestones[index].amountCents,
  };
}
export const ollamaSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "assumptions", "exclusions", "milestones"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    assumptions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    exclusions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    milestones: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "criteria"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          criteria: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: { type: "string" },
          },
        },
      },
    },
  },
};
