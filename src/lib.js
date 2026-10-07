import { hosted, hostedRequest } from "./hosting.js";
export async function api(url, options = {}) {
  if (hosted) return hostedRequest(url, options);
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Could not reach the ScopePay server." }));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
export const post = (url, data) =>
  api(url, { method: "POST", body: JSON.stringify(data) });
export const money = (cents) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const example = {
  client: "Acme Studio",
  budget: "2400",
  brief:
    "We need a modern ecommerce website for our skincare brand. The site should include a product catalog, product detail pages, a shopping cart, and a secure checkout. We'd like a clean, modern design that works well on mobile and desktop. Please include basic SEO setup, integration with our existing email marketing tool, and a short handoff at the end so our team can manage the content.",
};
export const preview = [
  {
    title: "Discovery & direction",
    percent: 20,
    description:
      "Align on goals, audience and requirements. Review references and finalize the plan.",
    criteria: [
      "Project goals documented, key pages defined, and technical requirements agreed.",
    ],
  },
  {
    title: "Design & build",
    percent: 50,
    description:
      "Create the visual design and build the ecommerce website with core features, content and integrations.",
    criteria: [
      "Responsive site with product catalog, cart and secure checkout, integrated with the agreed email marketing tool.",
    ],
  },
  {
    title: "Handoff & launch",
    percent: 30,
    description:
      "Testing, performance checks, SEO setup and a handoff session for your team.",
    criteria: [
      "Site deployed, agreed SEO settings in place, and handoff session completed with documentation.",
    ],
  },
];
export function reviewOf(project) {
  return {
    title: project.title,
    summary: project.summary,
    assumptions: [...project.assumptions],
    exclusions: [...project.exclusions],
    milestones: project.milestones.map((m) => ({
      title: m.title,
      description: m.description,
      criteria: [...m.criteria],
      percent: m.percent,
    })),
  };
}
export function exportProposal(p) {
  const lines = [
    `# ${p.title}`,
    "",
    `Client: ${p.client}`,
    `Budget: ${money(p.totalCents)} USD`,
    `Status: ${p.state}`,
    `Generated with ${p.source === "groq" ? "Groq cloud AI" : "local Ollama"} (${p.model}); reviewed by the project owner.`,
    "",
    p.summary,
    "",
    "## Milestones",
  ];
  p.milestones.forEach((m, i) =>
    lines.push(
      "",
      `### ${i + 1}. ${m.title} — ${money(m.amountCents)} (${m.percent}%)`,
      m.description,
      "",
      "Acceptance criteria:",
      ...m.criteria.map((c) => `- ${c}`),
      "",
      m.payment
        ? `Paid in PayPal sandbox. Capture: ${m.payment.captureId}`
        : "Not paid.",
    ),
  );
  lines.push(
    "",
    "## Assumptions",
    ...p.assumptions.map((a) => `- ${a}`),
    "",
    "## Out of scope",
    ...p.exclusions.map((a) => `- ${a}`),
    "",
    "Prototype: direct sandbox payments, no escrow. This proposal is a planning document, not a legal contract.",
  );
  const url = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `scopepay-${p.id.slice(0, 8)}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give slow browsers time to consume the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
