import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, runTransaction, terminate } from "firebase/firestore";
import { d1Query } from "./d1-data.mjs";

const COLLECTIONS = ["products", "users", "orders", "offers", "heroDisplay", "settings", "workers", "messages", "newsletter"];

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export function sanitizeRecord(name, data) {
  if (name !== "workers") return data;
  const safe = { ...data };
  for (const key of ["password", "newPassword", "passwordHash", "password_hash", "salt"]) delete safe[key];
  return { ...safe, disabled: true };
}

async function sql(statement, params = []) {
  return (await d1Query(statement, params)).results;
}

async function readSource(db) {
  const records = [];
  for (const name of COLLECTIONS) {
    const snapshot = await getDocs(collection(doc(db, "projects", "zitron"), name));
    for (const item of snapshot.docs) records.push({ collection: name, id: item.id, data: item.data(), ref: item.ref });
    console.log(JSON.stringify({ source: name, count: snapshot.size }));
  }
  return records;
}

function key(record) {
  return JSON.stringify([record.collection, record.id]);
}

async function main() {
  const mode = process.argv[2] ?? "--audit";
  if (!["--audit", "--apply", "--verify", "--purge-firestore"].includes(mode)) throw new Error("Unknown migration mode.");
  if (mode === "--purge-firestore" && !process.argv.includes("--confirm-zitron-only-after-deployment")) {
    throw new Error("Purge requires explicit confirmation after successful deployment and verification.");
  }
  const source = await readFile(new URL("../src/lib/firebase.ts", import.meta.url), "utf8");
  const config = Object.fromEntries([...source.matchAll(/^\s+(\w+): "([^"]+)",?$/gm)].map((match) => [match[1], match[2]]));
  if (config.projectId !== "dimaboutique-b4f16") throw new Error("Unexpected source project; migration refused.");
  const db = getFirestore(initializeApp(config));
  try {
    const records = await readSource(db);
    if (mode === "--audit") return;
    if (mode === "--apply") {
      await sql(`CREATE TABLE IF NOT EXISTS zitron_migration (
        collection TEXT NOT NULL, id TEXT NOT NULL, source_hash TEXT NOT NULL,
        snapshot_data TEXT NOT NULL, PRIMARY KEY(collection,id))`);
    }
    const existing = new Map((await sql("SELECT collection,id,data FROM documents")).map((row) => [key(row), row]));
    const journal = new Map((await sql("SELECT collection,id,source_hash,snapshot_data FROM zitron_migration")).map((row) => [key(row), row]));
    let copied = 0;
    for (const record of records) {
      const recordKey = key(record);
      const receipt = journal.get(recordKey);
      const target = existing.get(recordKey);
      const safeData = sanitizeRecord(record.collection, record.data);
      const sourceHash = digest(record.data);
      const targetHash = target ? digest(JSON.parse(target.data)) : null;
      if (mode === "--apply") {
        if (receipt?.source_hash === sourceHash) {
          if (!target) throw new Error(`Previously migrated ${record.collection} record is absent; resolve before continuing.`);
          continue;
        }
        const baselineHash = receipt ? digest(JSON.parse(receipt.snapshot_data)) : digest(safeData);
        if (target && targetHash !== baselineHash) {
          throw new Error(`Conflicting ${record.collection} changes in source and destination; no overwrite performed.`);
        }
        await sql("INSERT INTO documents(collection,id,data) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data",
          [record.collection, record.id, JSON.stringify(safeData)]);
        await sql("INSERT INTO zitron_migration(collection,id,source_hash,snapshot_data) VALUES(?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET source_hash=excluded.source_hash,snapshot_data=excluded.snapshot_data",
          [record.collection, record.id, sourceHash, JSON.stringify(safeData)]);
        copied++;
      } else if (!receipt || receipt.source_hash !== sourceHash || digest(JSON.parse(receipt.snapshot_data)) !== digest(safeData) || !target) {
        throw new Error(`Unverified ${record.collection} record; sync and verify before removing any source data.`);
      }
    }
    if (mode === "--apply") console.log(JSON.stringify({ copied, total: records.length }));
    if (mode === "--verify") console.log(JSON.stringify({ verified: records.length, backup: "private D1 migration snapshots" }));
    if (mode !== "--purge-firestore") return;
    for (let offset = 0; offset < records.length; offset += 40) {
      const batch = records.slice(offset, offset + 40);
      await runTransaction(db, async (transaction) => {
        const latest = await Promise.all(batch.map((record) => transaction.get(record.ref)));
        latest.forEach((snapshot, index) => {
          if (snapshot.exists() && digest(snapshot.data()) !== digest(batch[index].data)) {
            throw new Error("Source changed during retirement; stopping without deleting the changed batch.");
          }
        });
        batch.forEach((record) => transaction.delete(record.ref));
      });
    }
    const remaining = await readSource(db);
    if (remaining.length) throw new Error("New legacy records appeared; synchronize them before completing retirement.");
    console.log(JSON.stringify({ retired: records.length, scope: "projects/zitron only" }));
  } finally {
    await terminate(db);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
