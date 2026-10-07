# Judge access

Open https://scopepay-6ac67660.appwrite.network in a regular desktop browser. An anonymous Appwrite workspace session is created automatically; no judge AI key is needed. Use sample client information and click Generate proposal. Review and edit the actual AI output, confirm the percentages total 100, check the review box and approve. Reload, open Saved projects and export the scope.

Projects belong to the browser session. Clearing browser data or switching profiles loses access to that anonymous workspace. Briefs are sent to Groq and stored in Appwrite; use sample information.

## Payment testing

PayPal sandbox credentials and a completed real capture are still pending verification. The owner must finish this before final submission. Once enabled, select a milestone, accept its criteria and choose Pay with PayPal. Sign in with a sandbox personal buyer distinct from the merchant, approve, return and select Complete sandbox payment. Only a verified completed capture marks the milestone paid. No real money moves.

Create your own free sandbox buyer in https://developer.paypal.com/dashboard/accounts. Hosted visitors never need merchant secrets. If judges need a provided buyer, put access instructions in Devpost's judging-access field rather than publishing passwords in the repository.

## Local alternative

Follow README setup: Node dependencies, Ollama and the default Qwen model, then a sandbox merchant app in ignored `.env.local`. Run `npm run dev` and open http://127.0.0.1:5173. Local AI needs no cloud API key. Use your own sandbox buyer for payment testing.

Keep judge access available through December 15, 2026. Monitor provider free quotas. If cloud AI reaches its quota, wait or use the documented local version. Never substitute canned output or a fake payment receipt.
