import { pbkdf2Sync, randomBytes } from "node:crypto";
import { d1Query, getD1Records } from "./d1-data.mjs";

const username = process.env.ZITRON_ADMIN_USERNAME?.trim().toLowerCase();
const password = process.env.ZITRON_ADMIN_PASSWORD;
if (!username || !password || password.length < 20) {
  throw new Error("Supply administrator username and a generated password of at least 20 characters through the process environment.");
}

function passwordFields(value) {
  const salt = randomBytes(16);
  return [salt.toString("base64url"), pbkdf2Sync(value, salt, 100000, 32, "sha256").toString("base64url"), 100000];
}

const now = new Date().toISOString();
const adminId = "store-admin";
const existing = (await d1Query("SELECT role FROM staff_accounts WHERE id=?", [adminId])).results[0];
if (existing && (existing.role !== "admin" || !process.argv.includes("--rotate"))) {
  throw new Error("Administrator already exists; explicit --rotate is required to replace its password.");
}
if (existing) {
  await d1Query("UPDATE staff_accounts SET enabled=0 WHERE id=?", [adminId]);
  await d1Query("DELETE FROM staff_sessions WHERE account_id=?", [adminId]);
}
await d1Query(`INSERT INTO staff_accounts
  (id,username,email,name,role,password_salt,password_hash,password_iterations,enabled,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET username=excluded.username,email=excluded.email,
    password_salt=excluded.password_salt,password_hash=excluded.password_hash,
    password_iterations=excluded.password_iterations,enabled=1,updated_at=excluded.updated_at`,
[adminId, username, `${username}@zitron.invalid`, "مدير النظام", "admin", ...passwordFields(password), 1, now, now]);

let migrated = 0;
for (const worker of await getD1Records("workers")) {
  if ((await d1Query("SELECT id FROM staff_accounts WHERE id=?", [worker.id])).results.length) continue;
  const email = typeof worker.data.email === "string" ? worker.data.email.trim().toLowerCase() : "";
  if (!email || typeof worker.data.name !== "string") throw new Error("A legacy worker requires profile correction before provisioning.");
  await d1Query(`INSERT INTO staff_accounts
    (id,username,email,name,role,password_salt,password_hash,password_iterations,enabled,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  [worker.id, email, email, worker.data.name, "worker", ...passwordFields(randomBytes(32).toString("base64url")), 0, worker.data.createdAt || now, now]);
  migrated++;
}
console.log(JSON.stringify({ administrator: "provisioned", workersRequiringPasswordReset: migrated, plaintextPasswordsStored: false }));
