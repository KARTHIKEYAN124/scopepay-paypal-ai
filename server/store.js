import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

export async function createStore(file) {
  let projects = {};
  if (file) {
    await mkdir(path.dirname(file), { recursive: true });
    try {
      projects = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  let writes = Promise.resolve();
  const locks = new Map();
  return {
    get: (id) => projects[id],
    list: () =>
      Object.values(projects).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    async put(project) {
      const snapshot = { ...projects, [project.id]: project };
      projects = snapshot;
      if (!file) return;
      const json = JSON.stringify(snapshot, null, 2);
      const write = writes
        .catch(() => {})
        .then(async () => {
          await writeFile(`${file}.tmp`, json);
          await rename(`${file}.tmp`, file);
        });
      writes = write;
      await write;
    },
    async locked(id, action) {
      const previous = locks.get(id) || Promise.resolve();
      const current = previous.catch(() => {}).then(action);
      locks.set(id, current);
      try {
        return await current;
      } finally {
        if (locks.get(id) === current) locks.delete(id);
      }
    },
  };
}
