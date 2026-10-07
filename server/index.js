import dotenv from "dotenv";
import path from "node:path";
import express from "express";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createApp } from "./app.js";
import { createStore } from "./store.js";
import { createProviders } from "./providers.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });
const port = Number(process.env.PORT || 3001);
const appUrl = process.env.APP_URL || "http://127.0.0.1:5173";
const config = {
  aiProvider: process.env.AI_PROVIDER || "ollama",
  groqKey: process.env.GROQ_API_KEY,
  model:
    process.env.AI_PROVIDER === "groq"
      ? process.env.GROQ_MODEL || "openai/gpt-oss-20b"
      : process.env.OLLAMA_MODEL || "qwen2.5:0.5b",
  ollamaUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  paypalClientId: process.env.PAYPAL_CLIENT_ID,
  paypalSecret: process.env.PAYPAL_CLIENT_SECRET,
  appUrl,
  allowedOrigins: [
    ...new Set([
      appUrl,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ]),
  ],
};
const store = await createStore(path.join(root, "data/projects.json"));
const app = createApp({ config, store, providers: createProviders(config) });
if (existsSync(path.join(root, "dist"))) {
  app.use(express.static(path.join(root, "dist")));
  app.get("/", (req, res) => res.sendFile(path.join(root, "dist/index.html")));
}
app.listen(port, "127.0.0.1", () =>
  console.log(
    `ScopePay API listening at http://127.0.0.1:${port} (PayPal sandbox only)`,
  ),
);
console.log(`Local AI model: ${config.model}`);
