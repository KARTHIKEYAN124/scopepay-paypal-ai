import { Account, Client, Functions } from "appwrite";

export const hosted = Boolean(import.meta.env.VITE_APPWRITE_PROJECT_ID);
let setup;
function session() {
  if (!setup)
    setup = (async () => {
      const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
      const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_ID;
      if (!endpoint || !functionId)
        throw new Error("Hosted configuration is incomplete.");
      const client = new Client()
        .setEndpoint(endpoint)
        .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
      const account = new Account(client);
      try {
        await account.get();
      } catch (e) {
        if (e.code !== 401) throw e;
        await account.createAnonymousSession();
      }
      return { functions: new Functions(client), functionId };
    })().catch((e) => {
      setup = undefined;
      throw e;
    });
  return setup;
}
export async function hostedRequest(url, options) {
  const { functions, functionId } = await session();
  const execution = await functions.createExecution({
    functionId,
    xpath: `/api${url}`,
    method: options.method || "GET",
    body: options.body || "",
    async: false,
    headers: { "content-type": "application/json" },
  });
  const data = JSON.parse(execution.responseBody || "{}");
  if (execution.responseStatusCode >= 400)
    throw new Error(data.error || "Request failed.");
  if (execution.status !== "completed")
    throw new Error(
      "Hosted request timed out or failed. Reload before retrying a payment.",
    );
  return data;
}
