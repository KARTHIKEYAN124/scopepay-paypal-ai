import "dotenv/config";
import { Client, TablesDB, TablesDBIndexType } from "node-appwrite";

for (const key of [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
])
  if (!process.env[key])
    throw new Error(
      `Set ${key} in your terminal or ignored .env file; never share keys in chat.`,
    );
const db = new TablesDB(
  new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
);
const databaseId = "scopepay";
async function create(action) {
  try {
    await action();
  } catch (e) {
    if (e.code !== 409) throw e;
  }
}
await create(() => db.create({ databaseId, name: "ScopePay" }));
for (const tableId of ["projects", "locks"]) {
  await create(() =>
    db.createTable({
      databaseId,
      tableId,
      name: tableId,
      permissions: [],
      rowSecurity: true,
    }),
  );
  for (const [key, size] of [
    ["owner", 36],
    [
      tableId === "projects" ? "payload" : "token",
      tableId === "projects" ? 65535 : 36,
    ],
  ]) {
    await create(() =>
      db.createStringColumn({ databaseId, tableId, key, size, required: true }),
    );
  }
  const deadline = Date.now() + 120000;
  for (;;) {
    const table = await db.getTable({ databaseId, tableId });
    if (table.columns.some((c) => c.status === "failed"))
      throw new Error(
        `Column creation failed for ${tableId}. Inspect the Console.`,
      );
    if (
      table.columns.length === 2 &&
      table.columns.every((c) => c.status === "available")
    )
      break;
    if (Date.now() > deadline)
      throw new Error("Columns still processing. Rerun this command shortly.");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (tableId === "projects")
    await create(() =>
      db.createIndex({
        databaseId,
        tableId,
        key: "by_owner",
        type: TablesDBIndexType.Key,
        columns: ["owner"],
      }),
    );
}
console.log(
  "Private ScopePay tables prepared. Wait for the by_owner index to become available in the Console before using the app.",
);
