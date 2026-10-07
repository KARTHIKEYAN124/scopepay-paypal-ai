# Free Appwrite Cloud deployment

ScopePay supports two modes: local Ollama + local storage, or Appwrite Sites + Functions + TablesDB + Groq cloud AI. The website is deployed at https://scopepay-6ac67660.appwrite.network in project `6ac676600032de209d02`, Frankfurt (`https://fra.cloud.appwrite.io/v1`). Site ID: `scopepay`; Function ID: `scopepay-api`; database ID: `scopepay`. Authenticated status and project-list requests have been verified live. Real Groq generation, scope approval and project persistence are verified. GROQ_API_KEY is configured as a project-level secret inherited by the Function. PayPal credentials and actual sandbox capture are still pending. Stay on the Free plans; quotas apply and this is a sandbox demo.

## 1. Accounts

Create a free account at https://cloud.appwrite.io/ and create a project. Note its project ID and regional API endpoint from project Settings. Create a free Groq account at https://console.groq.com/ and generate an API key. Use the Free plan. Do not share either provider's API keys in chat or commit them.

## 2. Private database

Create a temporary Appwrite API key with database/table/column/index read and write scopes. Store `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY` in an ignored `.env` file, then run:

```powershell
npm run setup:appwrite-db
```

The script creates database `scopepay`, private tables `projects` and `locks`, required string columns, and the `by_owner` index. Wait until the index shows Available. Delete the temporary setup API key after setup. Neither table nor rows should have public or user permissions: all access runs through the authenticated Function.

## 3. API Function

```powershell
npm run prepare:appwrite
```

In Appwrite Functions, create **ScopePay API**, runtime **Node.js 22**, entrypoint **index.js**, build command **npm install --omit=dev**, timeout **30 seconds**. Choose the smallest free specification. Execute access: **Users** (authenticated users, including anonymous sessions), never Any. Disable execution logging for sensitive request/response data if the Console offers it. Upload `.artifacts/scopepay-function.tar.gz` as a manual deployment and activate it. Grant the Function's ephemeral API key only row read/write scopes (`rows.read`, `rows.write`). If the Console requires related database/table read scopes, grant those too; do not grant schema write or user administration.

Set these **Function variables**, which stay on the server:

| Variable               | Value                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| `GROQ_API_KEY`         | Your Groq free API key                                            |
| `GROQ_MODEL`           | `openai/gpt-oss-20b` (hosted by Groq; no OpenAI account required) |
| `PAYPAL_CLIENT_ID`     | PayPal sandbox app client ID                                      |
| `PAYPAL_CLIENT_SECRET` | PayPal sandbox app secret                                         |
| `APPWRITE_DATABASE_ID` | `scopepay`                                                        |
| `APP_URL`              | Your final HTTPS Appwrite Site URL, without trailing slash        |

Appwrite supplies `APPWRITE_FUNCTION_API_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID` and the per-execution `x-appwrite-key`. Do not supply a permanent admin key to the Function. After changing variables, redeploy if required by the Console.

## 4. Static website

Enable anonymous sessions in Appwrite Auth Settings. Create a static Site with SPA fallback **index.html**. Note the generated HTTPS domain. Add that hostname as a **Web platform** in the Appwrite project. Use the exact Site URL as the Function's `APP_URL`.

Set these public build variables in your PowerShell terminal, replacing the example values with your actual project details:

```powershell
$env:VITE_APPWRITE_ENDPOINT = 'https://YOUR_REGION.cloud.appwrite.io/v1'
$env:VITE_APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID'
$env:VITE_APPWRITE_FUNCTION_ID = 'YOUR_FUNCTION_ID'
npm run prepare:appwrite -- --site
```

Upload `.artifacts/scopepay-site.tar.gz` to the Site as a manual deployment. It contains prebuilt files: output directory **.**, no install command, no build command, fallback **index.html**, adapter **Static**. Activate the deployment. If using Git integration instead, choose React/Vite, `npm ci`, `npm run build`, output `dist`, and set the same three public variables in Site build settings. Never put Groq, PayPal or Appwrite API secrets in `VITE_*` variables or Site assets.

## 5. Check the real hosted flow

Open the Site in a normal browser. Connections should show Groq and PayPal configured. Generate with the sample brief, edit and approve, then complete a PayPal sandbox payment and capture it after returning. Verify a receipt appears only after successful capture. Reload to confirm persistence. Use another browser profile to confirm it cannot list or open the first workspace's projects. Confirm the export names Groq, and inspect browser requests/assets for secret exposure.

A workspace uses an anonymous browser session. Clearing site data or using another browser loses access to that workspace; this prototype has no account recovery or cross-device login. Briefs are sent to Groq and stored in Appwrite; use sample data for judging. Anonymous signup has Appwrite rate limits, but this does not prevent determined quota abuse: monitor usage and disable execution or signup when not demonstrating. No real payments, escrow or dispute workflow is implemented.

Payment locks are durable across Function instances and are never automatically stolen. If an execution is killed, a lock may remain. Before deleting its row manually, verify that no execution is active and reconcile the associated PayPal order; persisted idempotency keys are retained. A locked project fails safely until inspected.

## Local mode

Leave all `VITE_APPWRITE_*` variables unset to use the existing local setup. Ollama remains the default. To use Groq locally instead, set `AI_PROVIDER=groq`, `GROQ_API_KEY` and optionally `GROQ_MODEL` in `.env.local` and restart. Local credentials stay local and are not copied into deployment archives.

Hosted calls use synchronous SDK executions because Appwrite does not persist asynchronous response bodies. Cloud provider calls share a 20-second deadline to leave room for storage and authentication within the 30-second synchronous gateway limit. If generation exceeds this limit, the app reports an error; no template replaces AI output. If checkout times out, reopen the project and reconcile its stored order before retrying.
