# ScopePay submission copy

## Elevator pitch
Turn a vague freelance brief into a reviewed scope and buyer-approved PayPal milestone payments.

## Inspiration
Freelancers often start work from vague messages, then discover that the client expected different deliverables. ScopePay connects agreement on the work to the amount payable for each milestone.

## What it does
Enter a client brief and USD budget. Real Groq cloud AI drafts three milestones, deliverables, testable acceptance criteria, assumptions and exclusions. Edit the proposal and percentages, then approve to lock the scope. The PayPal workflow lets a sandbox buyer accept milestone criteria, approve an order and return for server-side capture. The server verifies the project reference, currency, amount and completed capture before showing a receipt. Projects persist privately in Appwrite and can be exported as Markdown.

## How we built it
React and Vite provide the responsive interface. An authenticated Appwrite Node.js Function runs Express and Zod validation. Private TablesDB rows store owner-scoped projects; unique lock rows serialize payment updates across instances. Groq generates schema-constrained JSON with GPT-OSS 20B. Local mode uses free Ollama with Qwen 2.5 instead. PayPal Orders v2 and OAuth provide sandbox order creation, buyer approval and capture. Payment amounts use integer cents and persisted idempotency keys. AI cannot move money or approve its own output.

## Challenges
Keeping acceptance criteria useful; separating AI text from deterministic prices; reconciling cancelled or interrupted checkout; and isolating anonymous workspaces in a serverless deployment.

## Accomplishments
Verified real hosted AI generation, editable scope review, approval and persistence after reload. Automated tests cover payment gating, wrong amounts, repeated capture, owner isolation and concurrent updates. A real PayPal sandbox capture remains a submission gate; mocked tests are not a completed payment.

## What's next
Recoverable accounts and separate freelancer/client roles, verified payment webhooks, scope change negotiation and richer milestone plans.

## Built with
PayPal Orders v2, Appwrite Sites/Functions/TablesDB/Auth, Groq, GPT-OSS 20B, Ollama, Qwen 2.5, JavaScript, Node.js, Express, React, Vite, Zod, Lucide and Playwright. No sponsor-specific prize claims are made.

## Links
- Demo: https://scopepay-6ac67660.appwrite.network
- Source: https://github.com/KARTHIKEYAN124/scopepay-paypal-ai
- Video: pending public YouTube upload; insert the actual URL before submission.

## Testing instructions
Open the hosted demo in a regular desktop browser. Use sample data, generate, review/edit and approve a scope. Reload, open Saved projects and export. Appwrite creates an anonymous browser workspace; clearing browser data loses access. Hosted visitors need no AI key. Payment testing requires a PayPal sandbox personal buyer distinct from the merchant. See [judge instructions](JUDGING.md), [video plan](VIDEO.md) and [submission checklist](CHECKLIST.md). README contains complete local setup.

## Hackathon progress
The prototype, local Ollama integration, PayPal workflow, tests and Appwrite/Groq hosted deployment were developed or advanced during October 2026.

## Before final submission
Verify a real sandbox capture, upload an actual functional video under three minutes publicly to YouTube, confirm entrant eligibility and rights, and enter all links and judging-access information in Devpost. Keep access available through December 15, 2026.
