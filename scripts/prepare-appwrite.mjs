import { mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, ".artifacts");
const api = resolve(output, "function");
await mkdir(resolve(api, "server"), { recursive: true });
// Explicit allowlist: never copy .env files, local data or node_modules.
for (const file of ["app.js", "domain.js", "providers.js", "cloud-store.js"])
  await copyFile(resolve(root, "server", file), resolve(api, "server", file));
await copyFile(resolve(root, "appwrite/function.js"), resolve(api, "index.js"));
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const dependencies = Object.fromEntries(
  ["express", "zod", "node-appwrite", "serverless-http"].map((name) => [
    name,
    pkg.dependencies[name],
  ]),
);
await writeFile(
  resolve(api, "package.json"),
  JSON.stringify(
    {
      name: "scopepay-api",
      version: "0.1.0",
      type: "module",
      private: true,
      dependencies,
    },
    null,
    2,
  ),
);
execFileSync(
  "tar",
  ["-czf", resolve(output, "scopepay-function.tar.gz"), "-C", api, "index.js", "package.json", "server/app.js", "server/domain.js", "server/providers.js", "server/cloud-store.js"],
  { stdio: "inherit" },
);
console.log(
  "Prepared .artifacts/scopepay-function.tar.gz. Entrypoint: index.js; build: npm install --omit=dev; runtime: Node.js 22.",
);
if (process.argv.includes("--site")) {
  for (const name of [
    "VITE_APPWRITE_ENDPOINT",
    "VITE_APPWRITE_PROJECT_ID",
    "VITE_APPWRITE_FUNCTION_ID",
  ])
    if (!process.env[name])
      throw new Error(`Set ${name} before building the hosted site.`);
  execFileSync(
    process.execPath,
    [resolve(root, "node_modules/vite/bin/vite.js"), "build"],
    { cwd: root, stdio: "inherit" },
  );
  execFileSync(
    "tar",
    [
      "-czf",
      resolve(output, "scopepay-site.tar.gz"),
      "-C",
      resolve(root, "dist"),
      ".",
    ],
    { stdio: "inherit" },
  );
  console.log(
    "Prepared .artifacts/scopepay-site.tar.gz for a static Site (output directory: ., fallback: index.html, no build command).",
  );
}
