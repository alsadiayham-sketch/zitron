import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function loadBackend() {
  const filename = new URL("functions/_lib/backend.ts", root);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename.pathname,
  });
  const moduleRecord = { exports: {} };
  const context = vm.createContext({
    atob,
    btoa,
    console,
    crypto: globalThis.crypto,
    Date,
    Headers,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Request,
    Response,
    Set,
    String,
    TextDecoder,
    TextEncoder,
    URL,
    URLSearchParams,
    fetch: (...args) => globalThis.fetch(...args),
  });
  const wrapper = new vm.Script(
    `(function (exports, require, module) { ${outputText}\n})`,
    { filename: filename.pathname }
  ).runInContext(context);
  wrapper(moduleRecord.exports, () => {
    throw new Error("backend.ts must remain dependency-free");
  }, moduleRecord);
  return moduleRecord.exports;
}

const backend = loadBackend();

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async first() {
    const sql = this.sql;
    if (sql.includes("FROM staff_sessions s JOIN staff_accounts a")) {
      const [tokenHash, now] = this.values;
      const session = this.db.sessions.get(tokenHash);
      const account = session ? this.db.staff.get(session.account_id) : null;
      if (!session || !account || session.revoked_at || session.expires_at <= now || !account.enabled) return null;
      return { id: account.id, role: account.role, name: account.name, email: account.email };
    }
    if (sql.includes("FROM staff_accounts WHERE username = ? OR email = ?")) {
      const username = String(this.values[0]).toLowerCase();
      return [...this.db.staff.values()].find(
        (account) => account.username.toLowerCase() === username || account.email.toLowerCase() === username
      ) ?? null;
    }
    if (sql.includes("FROM login_rate_limits WHERE bucket = ?")) {
      return this.db.rateLimits.get(this.values[0]) ?? null;
    }
    if (sql.includes("FROM documents WHERE collection = ? AND id = ?")) {
      const [collection, id] = this.values;
      const data = this.db.documents.get(`${collection}/${id}`);
      return data === undefined ? null : { id, data };
    }
    if (sql.includes("FROM order_tokens")) {
      const [id, tokenHash] = this.values;
      return this.db.orderTokens.get(id) === tokenHash ? { order_doc_id: id } : null;
    }
    if (sql.includes("SELECT content_type, data FROM media WHERE id = ?")) {
      return this.db.media.get(this.values[0]) ?? null;
    }
    if (sql.includes("FROM order_idempotency")) return null;
    return null;
  }
  async all() {
    const sql = this.sql;
    if (sql.includes("FROM documents WHERE collection = ?")) {
      const collection = this.values[0];
      const results = [...this.db.documents.entries()]
        .filter(([key]) => key.startsWith(`${collection}/`))
        .map(([key, data]) => ({ id: key.slice(collection.length + 1), data }));
      return { success: true, results };
    }
    if (sql.includes("FROM staff_accounts WHERE role = 'worker'")) {
      const results = [...this.db.staff.values()]
        .filter((account) => account.role === "worker")
        .map((account) => ({
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
          created_at: account.created_at,
          enabled: account.enabled,
        }));
      return { success: true, results };
    }
    return { success: true, results: [] };
  }
  async run() {
    const sql = this.sql;
    if (sql.startsWith("UPDATE staff_sessions SET revoked_at")) {
      const [revokedAt, tokenHash] = this.values;
      const session = this.db.sessions.get(tokenHash);
      if (session) session.revoked_at = revokedAt;
    } else if (sql.startsWith("INSERT INTO login_rate_limits")) {
      const [bucket, window_started_at, failures, blocked_until] = this.values;
      this.db.rateLimits.set(bucket, {
        window_started_at,
        failures,
        blocked_until,
      });
    } else if (sql.startsWith("DELETE FROM login_rate_limits")) {
      this.db.rateLimits.delete(this.values[0]);
      this.db.rateLimits.delete(this.values[1]);
    } else if (sql.startsWith("INSERT INTO staff_sessions")) {
      const [token_hash, account_id, created_at, expires_at, ip_hash, user_agent_hash] = this.values;
      this.db.sessions.set(token_hash, { account_id, created_at, expires_at, ip_hash, user_agent_hash, revoked_at: null });
    } else if (sql.startsWith("UPDATE documents SET data")) {
      const [data, id] = this.values;
      this.db.documents.set(`orders/${id}`, data);
    } else if (sql.startsWith("INSERT INTO media")) {
      const [id, content_type, data, created_at] = this.values;
      this.db.media.set(id, { content_type, data, created_at });
    }
    return { success: true };
  }
}

class FakeD1 {
  constructor() {
    this.documents = new Map();
    this.staff = new Map();
    this.sessions = new Map();
    this.rateLimits = new Map();
    this.orderTokens = new Map();
    this.media = new Map();
  }
  prepare(sql) {
    return new FakeStatement(this, sql);
  }
  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

function request(path, init = {}) {
  return new Request(`https://zitron.example${path}`, init);
}

async function responseJson(response) {
  return JSON.parse(await response.text());
}

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function createFirebaseToken(uid, { tamper = false, kid = `kid-${uid}` } = {}) {
  const keys = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", kid, typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: "https://securetoken.google.com/dimaboutique-b4f16",
    aud: "dimaboutique-b4f16",
    sub: uid,
    iat: now - 5,
    exp: now + 3600,
    email: `${uid}@example.com`,
  }));
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keys.privateKey,
    new TextEncoder().encode(`${header}.${payload}`)
  ));
  if (tamper) signature[0] ^= 1;
  return {
    token: `${header}.${payload}.${Buffer.from(signature).toString("base64url")}`,
    jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
    kid,
  };
}

test("PBKDF2 passwords reject a wrong password", async () => {
  const stored = await backend.hashPassword("correct horse battery staple");
  assert.equal(await backend.verifyPassword("correct horse battery staple", stored.salt, stored.hash, stored.iterations), true);
  assert.equal(await backend.verifyPassword("wrong password here", stored.salt, stored.hash, stored.iterations), false);
  assert.equal(stored.iterations, 100000);
});

test("login rejects a wrong password without exposing password material", async () => {
  const db = new FakeD1();
  const stored = await backend.hashPassword("correct horse battery staple");
  db.staff.set("admin-1", {
    id: "admin-1",
    username: "admin",
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
    password_salt: stored.salt,
    password_hash: stored.hash,
    password_iterations: stored.iterations,
    enabled: 1,
  });
  const response = await backend.handleLogin({
    env: { DB: db },
    request: request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Zitron-Request": "1" },
      body: JSON.stringify({ username: "admin", password: "totally wrong password" }),
    }),
  });
  assert.equal(response.status, 401);
  const body = await responseJson(response);
  assert.deepEqual(body, { error: "Invalid username or password." });
  assert.equal(response.headers.has("Set-Cookie"), false);
});

test("forged staff cookies and unauthenticated protected access fail closed", async () => {
  const db = new FakeD1();
  db.documents.set("orders/order-a", JSON.stringify({ orderId: "ZT-ABCDEFGH", userId: "u1" }));
  const forged = await backend.handleDataGet({
    env: { DB: db },
    request: request("/api/data?collection=orders", {
      headers: { Cookie: "__Host-zitron_staff=forged-token-that-is-long-enough-to-look-real-123456" },
    }),
  });
  assert.equal(forged.status, 401);

  const mutation = await backend.handleDataMutation({
    env: { DB: db },
    request: request("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Zitron-Request": "1" },
      body: JSON.stringify({ collection: "products", id: "p1", data: { name: "forged" } }),
    }),
  });
  assert.equal(mutation.status, 403);
});

test("worker sessions cannot escalate into catalog writes", async () => {
  const db = new FakeD1();
  const token = "valid-worker-session-token-123456789012345678901234";
  const tokenHash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("hex");
  db.staff.set("worker-1", {
    id: "worker-1",
    username: "worker@example.com",
    email: "worker@example.com",
    name: "Worker",
    role: "worker",
    enabled: 1,
  });
  db.sessions.set(tokenHash, {
    account_id: "worker-1",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    revoked_at: null,
  });
  const response = await backend.handleDataMutation({
    env: { DB: db },
    request: request("/api/data", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Zitron-Request": "1",
        Cookie: `__Host-zitron_staff=${token}`,
      },
      body: JSON.stringify({ collection: "products", id: "p1", data: { price: 0 } }),
    }),
  });
  assert.equal(response.status, 403);
});

test("customer order reads are forcibly restricted to the verified UID", async () => {
  const db = new FakeD1();
  db.documents.set("orders/order-u1", JSON.stringify({ orderId: "ZT-USER0001", userId: "u1" }));
  db.documents.set("orders/order-u2", JSON.stringify({ orderId: "ZT-USER0002", userId: "u2" }));
  const signed = await createFirebaseToken("u1");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ [signed.kid]: signed.jwk }), {
    status: 200,
    headers: { "Cache-Control": "max-age=60", "Content-Type": "application/json" },
  });
  try {
    const response = await backend.handleDataGet({
      env: { DB: db },
      request: request("/api/data?collection=orders", {
        headers: { Authorization: `Bearer ${signed.token}` },
      }),
    });
    assert.equal(response.status, 200);
    const body = await responseJson(response);
    assert.deepEqual(body.docs.map((doc) => doc.id), ["order-u1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Firebase verification rejects a signature-tampered token", async () => {
  const signed = await createFirebaseToken("u3", { tamper: true });
  await assert.rejects(
    backend.verifyFirebaseIdToken(signed.token, {
      fetchFn: async () => new Response(JSON.stringify({ keys: [{ ...signed.jwk, kid: signed.kid }] }), {
        status: 200,
        headers: { "Cache-Control": "max-age=60" },
      }),
    }),
    /Invalid identity token/
  );
});

test("admin upload validates image magic bytes and serves only stored image bytes", async () => {
  const db = new FakeD1();
  const token = "valid-admin-session-token-1234567890123456789012345";
  const tokenHash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("hex");
  db.staff.set("admin-1", {
    id: "admin-1",
    username: "admin@example.com",
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
    enabled: 1,
  });
  db.sessions.set(tokenHash, {
    account_id: "admin-1",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    revoked_at: null,
  });
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const upload = await backend.handleUpload({
    env: { DB: db },
    request: request("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Zitron-Request": "1",
        Cookie: `__Host-zitron_staff=${token}`,
      },
      body: JSON.stringify({ image: png.toString("base64"), mimeType: "image/png" }),
    }),
  });
  assert.equal(upload.status, 201);
  const { url } = await responseJson(upload);
  assert.match(url, /^\/api\/media\/img_/);
  const id = url.split("/").at(-1);
  const media = await backend.handleMediaGet({
    env: { DB: db },
    params: { id },
    request: request(url),
  });
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("Content-Type"), "image/png");
  assert.equal(media.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(Buffer.from(await media.arrayBuffer()), png);

  assert.throws(
    () => backend.decodeAndValidateImage(Buffer.from("not a png").toString("base64"), "image/png"),
    /does not match/
  );
});

test("workers GET merges migrated metadata with protected account status and never returns passwords", async () => {
  const db = new FakeD1();
  const token = "valid-admin-worker-list-token-1234567890123456789012";
  const tokenHash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("hex");
  db.staff.set("admin-1", {
    id: "admin-1", username: "admin", email: "admin@example.com",
    name: "Admin", role: "admin", enabled: 1,
  });
  db.staff.set("worker-protected", {
    id: "worker-protected", username: "protected@example.com", email: "protected@example.com",
    name: "Protected Worker", role: "worker", created_at: "2026-10-01T00:00:00.000Z",
    enabled: 0, password_hash: "must-not-leak",
  });
  db.sessions.set(tokenHash, {
    account_id: "admin-1",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    revoked_at: null,
  });
  db.documents.set("workers/worker-legacy", JSON.stringify({
    name: "Legacy Worker",
    email: "legacy@example.com",
    password: "old-public-password",
    disabled: true,
  }));
  db.documents.set("workers/worker-protected", JSON.stringify({
    name: "Stale Name",
    email: "stale@example.com",
    password: "old-public-password",
    disabled: true,
  }));

  const response = await backend.handleDataGet({
    env: { DB: db },
    request: request("/api/data?collection=workers", {
      headers: { Cookie: `__Host-zitron_staff=${token}` },
    }),
  });
  assert.equal(response.status, 200);
  const body = await responseJson(response);
  assert.equal(body.docs.length, 2);
  assert.equal(body.docs.find((worker) => worker.id === "worker-legacy").data.disabled, true);
  const protectedWorker = body.docs.find((worker) => worker.id === "worker-protected");
  assert.equal(protectedWorker.data.name, "Protected Worker");
  assert.equal(protectedWorker.data.enabled, false);
  assert.equal(protectedWorker.data.disabled, true);
  assert.equal(JSON.stringify(body).includes("password"), false);
  assert.equal(JSON.stringify(body).includes("must-not-leak"), false);
});
