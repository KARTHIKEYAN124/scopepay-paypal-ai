import { Query } from "node-appwrite";
import { randomUUID } from "node:crypto";

// Tables have no client permissions. Every read and write is owner-scoped here.
export function createCloudStore(db, databaseId, owner) {
  const location = (tableId, rowId) => ({ databaseId, tableId, rowId });
  async function read(id) {
    try {
      const row = await db.getRow(location("projects", id));
      return row.owner === owner ? JSON.parse(row.payload) : undefined;
    } catch (error) {
      if (error.code === 404) return undefined;
      throw error;
    }
  }
  return {
    get: read,
    async list() {
      const result = [];
      let cursor;
      do {
        const page = await db.listRows({
          databaseId,
          tableId: "projects",
          queries: [
            Query.equal("owner", owner),
            Query.limit(100),
            ...(cursor ? [Query.cursorAfter(cursor)] : []),
          ],
        });
        result.push(...page.rows.map((r) => JSON.parse(r.payload)));
        cursor = page.rows.length === 100 ? page.rows.at(-1).$id : undefined;
      } while (cursor);
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async put(project) {
      const data = { owner, payload: JSON.stringify(project) };
      try {
        const row = await db.getRow(location("projects", project.id));
        if (row.owner !== owner)
          throw Object.assign(new Error("Project not found."), { status: 404 });
        await db.updateRow({ ...location("projects", project.id), data });
      } catch (error) {
        if (error.code !== 404) throw error;
        await db.createRow({
          ...location("projects", project.id),
          data,
          permissions: [],
        });
      }
    },
    async locked(id, action) {
      // A unique row provides a lock across Function instances. Never steal a
      // payment lock on a timer: a previous external payment may still be running.
      if (!(await read(id)))
        throw Object.assign(new Error("Project not found."), { status: 404 });
      const token = randomUUID();
      try {
        await db.createRow({
          ...location("locks", id),
          data: { owner, token },
          permissions: [],
        });
      } catch (error) {
        if (error.code === 409)
          throw Object.assign(
            new Error(
              "Another update is in progress. Try again shortly. If this persists, ask the site owner to inspect the project lock.",
            ),
            { status: 409 },
          );
        throw error;
      }
      try {
        return await action();
      } finally {
        const lock = await db.getRow(location("locks", id));
        if (lock.token === token && lock.owner === owner)
          await db.deleteRow(location("locks", id));
      }
    },
  };
}
