import { Account, Client, TablesDB } from "node-appwrite";
import serverless from "serverless-http";
import { createApp } from "./server/app.js";
import { createProviders } from "./server/providers.js";
import { createCloudStore } from "./server/cloud-store.js";

export default async function ({ req, res, error }) {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const jwt = req.headers["x-appwrite-user-jwt"];
  if (!jwt) return res.json({ error: "A workspace session is required." }, 401);
  let user;
  try {
    user = await new Account(
      new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt),
    ).get();
  } catch {
    return res.json(
      { error: "Workspace session expired. Reload the page." },
      401,
    );
  }
  // Header identity alone is never trusted; Account.get verifies the session JWT.
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(req.headers["x-appwrite-key"]);
  const config = {
    signal: AbortSignal.timeout(20000),
    aiProvider: "groq",
    groqKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
    paypalSecret: process.env.PAYPAL_CLIENT_SECRET,
    appUrl: process.env.APP_URL,
    allowedOrigins: [],
  };
  if (!config.appUrl?.startsWith("https://"))
    return res.json({ error: "The site owner must configure APP_URL." }, 503);
  try {
    const store = createCloudStore(
      new TablesDB(client),
      process.env.APPWRITE_DATABASE_ID || "scopepay",
      user.$id,
    );
    const app = createApp({
      config,
      store,
      providers: createProviders(config),
    });
    const handler = serverless(app);
    const result = await handler(
      {
        httpMethod: req.method,
        path: req.path,
        headers: { host: "localhost", "content-type": "application/json" },
        body: req.bodyText || "",
        requestContext: { identity: { sourceIp: "127.0.0.1" } },
        isBase64Encoded: false,
      },
      {},
    );
    return res.text(result.body, result.statusCode, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
  } catch (cause) {
    error(`Hosted request failed: ${cause.name}`);
    return res.json(
      { error: "Hosted request failed. Check the Function configuration." },
      500,
    );
  }
}
