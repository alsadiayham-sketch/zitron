import { readFile } from "node:fs/promises";

export async function d1Query(sql, params = []) {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
  if (!token || !account) throw new Error("Supply Cloudflare credentials through the process environment.");
  const config = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");
  const database = config.match(/^database_id = "([^"]+)"$/m)?.[1];
  if (!database) throw new Error("Zitron D1 binding is not configured.");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const result = await response.json();
  if (!response.ok || !result.success || !result.result?.[0]?.success) {
    throw new Error(`D1 query failed (HTTP ${response.status}); record contents were not logged.`);
  }
  return result.result[0];
}

export async function getD1Records(collection) {
  const result = await d1Query("SELECT id,data FROM documents WHERE collection=?", [collection]);
  return result.results.map((row) => ({ id: row.id, data: JSON.parse(row.data) }));
}

export async function createD1RecordIfAbsent(collection, id, data) {
  const result = await d1Query("INSERT OR IGNORE INTO documents(collection,id,data) VALUES(?,?,?)", [collection, id, JSON.stringify(data)]);
  return result.meta.changes === 1;
}

export async function patchD1Record(collection, id, data) {
  const result = await d1Query("UPDATE documents SET data=json_patch(data,?) WHERE collection=? AND id=?", [JSON.stringify(data), collection, id]);
  if (result.meta.changes !== 1) throw new Error(`Cannot update missing ${collection} record.`);
}
