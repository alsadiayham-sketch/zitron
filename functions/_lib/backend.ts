const FIREBASE_PROJECT_ID = "dimaboutique-b4f16";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const STAFF_COOKIE = "__Host-zitron_staff";
const SESSION_SECONDS = 60 * 60 * 12;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_UPLOAD_BODY_BYTES = 1150 * 1024;
const MAX_IMAGE_BYTES = 750 * 1024;
const MAX_DOCUMENTS = 1000;
const MAX_QUERY_LIMIT = 100;
const PBKDF2_ITERATIONS = 100000;

type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
  meta?: Record<string, unknown>;
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<D1Result>;
};

export type D1DatabaseLike = {
  prepare: (sql: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<D1Result[]>;
};

export type Env = {
  DB: D1DatabaseLike;
};

export type FunctionContext = {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  waitUntil?: (promise: Promise<unknown>) => void;
};

type StaffSession = {
  id: string;
  role: "admin" | "worker";
  name: string;
  email?: string;
};

type FirebaseIdentity = {
  uid: string;
  email?: string;
  name?: string;
};

type Identity = {
  staff: StaffSession | null;
  customer: FirebaseIdentity | null;
};

type StoredDocument = {
  id: string;
  data: Record<string, unknown>;
};

type Constraint =
  | { type: "where"; field: string; op: "=="; value: unknown }
  | { type: "orderBy"; field: string; direction: "asc" | "desc" }
  | { type: "limit"; count: number }
  | { type: "startAfter"; id: string };

type JwkCache = {
  keys: Record<string, JsonWebKey>;
  expiresAt: number;
};

let jwkCache: JwkCache | null = null;

function headers(extra: HeadersInit = {}) {
  return new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  });
}

export function jsonResponse(payload: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), { status, headers: headers(extra) });
}

function errorResponse(status: number, error: string) {
  return jsonResponse({ error }, status);
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

function hex(bytes: ArrayBuffer | Uint8Array) {
  const values = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", utf8(value)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index % Math.max(left.length, 1)] ?? 0) ^
      (right[index % Math.max(right.length, 1)] ?? 0);
  }
  return difference === 0;
}

export async function hashPassword(
  password: string,
  saltBase64Url = bytesToBase64Url(randomBytes(16)),
  iterations = PBKDF2_ITERATIONS
) {
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  if (!Number.isInteger(iterations) || iterations < PBKDF2_ITERATIONS) {
    throw new Error("Password iteration count is too low.");
  }
  const key = await crypto.subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(saltBase64Url), iterations },
    key,
    256
  );
  return { salt: saltBase64Url, hash: bytesToBase64Url(new Uint8Array(bits)), iterations };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
  iterations: number
) {
  try {
    const calculated = await hashPassword(password.padEnd(12, "\0"), salt, iterations);
    return constantTimeEqual(base64UrlToBytes(calculated.hash), base64UrlToBytes(expectedHash));
  } catch {
    return false;
  }
}

function parseCookies(request: Request) {
  const result = new Map<string, string>();
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    result.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return result;
}

function remoteIp(request: Request) {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}

async function requireMutationRequest(request: Request) {
  if (request.headers.get("X-Zitron-Request") !== "1") {
    throw new HttpError(403, "Missing request verification header.");
  }
  const contentType = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new HttpError(415, "Content-Type must be application/json.");
  }
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new HttpError(403, "Cross-origin requests are not allowed.");
  }
}

async function readJson(request: Request, maxBytes = MAX_BODY_BYTES) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes) throw new HttpError(413, "Request body is too large.");
  const text = await request.text();
  if (utf8(text).byteLength > maxBytes) throw new HttpError(413, "Request body is too large.");
  try {
    const parsed = JSON.parse(text);
    assertSafeObject(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON body.");
  }
}

function assertSafeObject(value: unknown, depth = 0): void {
  if (depth > 20) throw new HttpError(400, "Object nesting is too deep.");
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > 500) throw new HttpError(400, "Array is too large.");
    for (const item of value) assertSafeObject(item, depth + 1);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      throw new HttpError(400, "Unsafe object key.");
    }
    assertSafeObject(nested, depth + 1);
  }
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function cleanString(value: unknown, maxLength: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new HttpError(400, "A required field is missing.");
  if (result.length > maxLength) throw new HttpError(400, "A field is too long.");
  return result;
}

function cleanId(value: unknown) {
  const result = cleanString(value, 180, true);
  if (!/^[A-Za-z0-9][A-Za-z0-9._~%:@+-]{0,179}$/.test(result)) {
    throw new HttpError(400, "Invalid document id.");
  }
  return result;
}

function cleanCollection(value: unknown) {
  const result = cleanString(value, 40, true);
  if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(result)) {
    throw new HttpError(400, "Invalid collection.");
  }
  return result;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "data must be an object.");
  }
  return value as Record<string, unknown>;
}

function parseStoredData(value: unknown) {
  if (typeof value !== "string") throw new HttpError(500, "Stored document is invalid.");
  const parsed = JSON.parse(value);
  assertSafeObject(parsed);
  return asRecord(parsed);
}

async function getDocument(db: D1DatabaseLike, collection: string, id: string) {
  const row = await db
    .prepare("SELECT id, data FROM documents WHERE collection = ? AND id = ?")
    .bind(collection, id)
    .first<{ id: string; data: string }>();
  return row ? { id: row.id, data: parseStoredData(row.data) } : null;
}

async function listDocuments(db: D1DatabaseLike, collection: string) {
  const rows = await db
    .prepare("SELECT id, data FROM documents WHERE collection = ? ORDER BY id LIMIT ?")
    .bind(collection, MAX_DOCUMENTS + 1)
    .all<{ id: string; data: string }>();
  if ((rows.results?.length ?? 0) > MAX_DOCUMENTS) {
    throw new HttpError(413, "Collection is too large for an unbounded query.");
  }
  return (rows.results ?? []).map((row) => ({ id: row.id, data: parseStoredData(row.data) }));
}

function fieldValue(document: StoredDocument, field: string) {
  if (field === "__name__" || field === "id") return document.id;
  return field.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>)[part];
  }, document.data);
}

function compareValues(left: unknown, right: unknown) {
  if (left === right) return 0;
  if (left === undefined || left === null) return -1;
  if (right === undefined || right === null) return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right));
}

function parseConstraints(raw: string | null): Constraint[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid constraints.");
  }
  if (!Array.isArray(parsed) || parsed.length > 10) throw new HttpError(400, "Invalid constraints.");
  return parsed.map((entry) => {
    const constraint = asRecord(entry);
    if (constraint.type === "where") {
      const field = cleanString(constraint.field, 80, true);
      if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(field) || constraint.op !== "==") {
        throw new HttpError(400, "Unsupported where constraint.");
      }
      return { type: "where", field, op: "==", value: constraint.value } as Constraint;
    }
    if (constraint.type === "orderBy") {
      const field = cleanString(constraint.field, 80, true);
      if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(field)) throw new HttpError(400, "Invalid order field.");
      const direction = constraint.direction === "desc" ? "desc" : constraint.direction === "asc" ? "asc" : null;
      if (!direction) throw new HttpError(400, "Invalid order direction.");
      return { type: "orderBy", field, direction } as Constraint;
    }
    if (constraint.type === "limit") {
      const count = Number(constraint.count);
      if (!Number.isInteger(count) || count < 1 || count > MAX_QUERY_LIMIT) {
        throw new HttpError(400, "Invalid query limit.");
      }
      return { type: "limit", count } as Constraint;
    }
    if (constraint.type === "startAfter") {
      return { type: "startAfter", id: cleanId(constraint.id) } as Constraint;
    }
    throw new HttpError(400, "Unsupported constraint.");
  });
}

function applyConstraints(documents: StoredDocument[], constraints: Constraint[]) {
  let result = [...documents];
  for (const constraint of constraints) {
    if (constraint.type === "where") {
      result = result.filter((document) => fieldValue(document, constraint.field) === constraint.value);
    }
  }
  const ordering = constraints.filter(
    (constraint): constraint is Extract<Constraint, { type: "orderBy" }> => constraint.type === "orderBy"
  );
  if (ordering.length) {
    result.sort((left, right) => {
      for (const order of ordering) {
        const comparison = compareValues(fieldValue(left, order.field), fieldValue(right, order.field));
        if (comparison) return order.direction === "desc" ? -comparison : comparison;
      }
      return left.id.localeCompare(right.id);
    });
  }
  const cursor = constraints.find(
    (constraint): constraint is Extract<Constraint, { type: "startAfter" }> => constraint.type === "startAfter"
  );
  if (cursor) {
    const index = result.findIndex((document) => document.id === cursor.id);
    if (index >= 0) result = result.slice(index + 1);
  }
  const limit = constraints.find(
    (constraint): constraint is Extract<Constraint, { type: "limit" }> => constraint.type === "limit"
  );
  return result.slice(0, limit?.count ?? MAX_QUERY_LIMIT);
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (!match) throw new HttpError(401, "Invalid authorization header.");
  return match[1];
}

async function fetchJwks(fetchFn: typeof fetch, force: boolean, nowMs: number) {
  if (!force && jwkCache && jwkCache.expiresAt > nowMs) return jwkCache.keys;
  const response = await fetchFn(FIREBASE_JWK_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new HttpError(503, "Identity verification is temporarily unavailable.");
  const payload = (await response.json()) as Record<string, unknown>;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(503, "Identity key response is invalid.");
  }
  const keys: Record<string, JsonWebKey> = {};
  if (Array.isArray(payload.keys)) {
    for (const value of payload.keys) {
      const candidate = value as Record<string, unknown>;
      if (value && typeof value === "object" && typeof candidate.kid === "string") {
        keys[candidate.kid] = value as JsonWebKey;
      }
    }
  } else {
    for (const [kid, value] of Object.entries(payload)) {
      if (value && typeof value === "object" && !Array.isArray(value)) keys[kid] = value as JsonWebKey;
    }
  }
  if (!Object.keys(keys).length) throw new HttpError(503, "Identity key response is invalid.");
  const maxAgeMatch = /(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get("Cache-Control") ?? "");
  const maxAge = Math.min(Math.max(Number(maxAgeMatch?.[1] ?? 300), 60), 3600);
  jwkCache = { keys, expiresAt: nowMs + maxAge * 1000 };
  return keys;
}

export async function verifyFirebaseIdToken(
  token: string,
  options: { fetchFn?: typeof fetch; nowMs?: number } = {}
): Promise<FirebaseIdentity> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Invalid identity token.");
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
  } catch {
    throw new HttpError(401, "Invalid identity token.");
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    throw new HttpError(401, "Invalid identity token.");
  }
  const nowMs = options.nowMs ?? Date.now();
  const fetchFn = options.fetchFn ?? fetch;
  let keys = await fetchJwks(fetchFn, false, nowMs);
  let jwk = keys[header.kid];
  if (!jwk) {
    keys = await fetchJwks(fetchFn, true, nowMs);
    jwk = keys[header.kid];
  }
  if (!jwk) throw new HttpError(401, "Unknown identity signing key.");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(parts[2]),
    utf8(`${parts[0]}.${parts[1]}`)
  );
  const now = Math.floor(nowMs / 1000);
  if (
    !valid ||
    payload.iss !== FIREBASE_ISSUER ||
    payload.aud !== FIREBASE_PROJECT_ID ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    payload.sub.length > 128 ||
    typeof payload.exp !== "number" ||
    payload.exp <= now ||
    typeof payload.iat !== "number" ||
    payload.iat > now + 300
  ) {
    throw new HttpError(401, "Invalid identity token.");
  }
  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}

async function getStaffSession(request: Request, db: D1DatabaseLike) {
  const token = parseCookies(request).get(STAFF_COOKIE);
  if (!token || token.length < 40 || token.length > 100) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT a.id, a.role, a.name, a.email
       FROM staff_sessions s
       JOIN staff_accounts a ON a.id = s.account_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL
         AND s.expires_at > ? AND a.enabled = 1`
    )
    .bind(tokenHash, now)
    .first<{ id: string; role: "admin" | "worker"; name: string; email: string }>();
  if (!row) return null;
  return { id: row.id, role: row.role, name: row.name, email: row.email };
}

async function identify(request: Request, db: D1DatabaseLike): Promise<Identity> {
  const [staff, token] = await Promise.all([getStaffSession(request, db), Promise.resolve(bearerToken(request))]);
  const customer = token ? await verifyFirebaseIdToken(token) : null;
  return { staff, customer };
}

function safeSettings(data: Record<string, unknown>) {
  const allowed = new Set([
    "storeName", "storeNameAr", "heroTitle", "heroSubtitle", "aboutText", "currency",
    "currencyName", "whatsappNumber", "instagramLink", "contactAddress", "contactPhone",
    "contactEmail", "contactWorkHours", "logo", "paymentVisa", "paymentMastercard", "paymentMada",
  ]);
  return Object.fromEntries(Object.entries(data).filter(([key]) => allowed.has(key)));
}

function sanitizeWorker(row: Record<string, unknown>) {
  const enabled = Boolean(row.enabled);
  return {
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    enabled,
    disabled: !enabled,
  };
}

async function listWorkers(db: D1DatabaseLike) {
  const [accountRows, legacyDocuments] = await Promise.all([
    db.prepare(
      "SELECT id, name, email, role, created_at, enabled FROM staff_accounts WHERE role = 'worker' ORDER BY name LIMIT ?"
    )
      .bind(MAX_QUERY_LIMIT)
      .all<Record<string, unknown>>(),
    listDocuments(db, "workers"),
  ]);
  const workers = new Map<string, StoredDocument>();
  for (const document of legacyDocuments) {
    workers.set(document.id, {
      id: document.id,
      data: {
        name: typeof document.data.name === "string" ? document.data.name : "",
        email: typeof document.data.email === "string" ? document.data.email : "",
        role: "worker",
        createdAt: typeof document.data.createdAt === "string" ? document.data.createdAt : "",
        enabled: false,
        disabled: true,
      },
    });
  }
  for (const row of accountRows.results ?? []) {
    const id = String(row.id);
    workers.set(id, { id, data: sanitizeWorker(row) });
  }
  return Array.from(workers.values())
    .sort((left, right) => String(left.data.name).localeCompare(String(right.data.name)))
    .slice(0, MAX_QUERY_LIMIT);
}

async function getWorker(db: D1DatabaseLike, id: string) {
  const [row, legacy] = await Promise.all([
    db.prepare("SELECT id, name, email, role, created_at, enabled FROM staff_accounts WHERE id = ? AND role = 'worker'")
      .bind(id)
      .first<Record<string, unknown>>(),
    getDocument(db, "workers", id),
  ]);
  if (row) return { id: String(row.id), data: sanitizeWorker(row) };
  if (!legacy) return null;
  return {
    id,
    data: {
      name: typeof legacy.data.name === "string" ? legacy.data.name : "",
      email: typeof legacy.data.email === "string" ? legacy.data.email : "",
      role: "worker",
      createdAt: typeof legacy.data.createdAt === "string" ? legacy.data.createdAt : "",
      enabled: false,
      disabled: true,
    },
  };
}

function publicCollection(collection: string) {
  return ["products", "offers", "heroDisplay", "settings"].includes(collection);
}

function adminCollection(collection: string) {
  return ["products", "offers", "heroDisplay", "settings", "users", "messages", "newsletter", "orders", "workers"].includes(collection);
}

async function authorizeRead(
  request: Request,
  db: D1DatabaseLike,
  collection: string,
  id: string | null,
  constraints: Constraint[],
  identity: Identity
) {
  if (identity.staff?.role === "admin" && adminCollection(collection)) {
    if (collection === "workers") return id ? [await getWorker(db, id)].filter(Boolean) : listWorkers(db);
    return null;
  }
  if (identity.staff?.role === "worker" && collection === "orders") return null;
  if (publicCollection(collection)) {
    if (collection === "settings") {
      if (id && id !== "config") throw new HttpError(404, "Document not found.");
      const config = await getDocument(db, "settings", "config");
      return config ? [config] : [];
    }
    return null;
  }
  if (collection === "users" && identity.customer) {
    if (id && id !== identity.customer.uid) throw new HttpError(403, "Access denied.");
    const document = await getDocument(db, collection, identity.customer.uid);
    return document ? [document] : [];
  }
  if (collection === "orders" && identity.customer) {
    const documents = id
      ? [await getDocument(db, collection, id)].filter((value): value is StoredDocument => Boolean(value))
      : await listDocuments(db, collection);
    return documents.filter((document) => document.data.userId === identity.customer?.uid);
  }
  if (collection === "orders") {
    const trackingToken = request.headers.get("X-Zitron-Order-Token");
    if (!trackingToken) throw new HttpError(401, "Order tracking token is required.");
    const orderIdConstraint = constraints.find(
      (constraint): constraint is Extract<Constraint, { type: "where" }> =>
        constraint.type === "where" && constraint.field === "orderId" && typeof constraint.value === "string"
    );
    if (!id && !orderIdConstraint) throw new HttpError(400, "A specific order is required.");
    const document = id
      ? await getDocument(db, collection, id)
      : (await listDocuments(db, collection)).find((candidate) => candidate.data.orderId === orderIdConstraint?.value) ?? null;
    if (!document) return [];
    const tokenHash = await sha256(trackingToken);
    const match = await db
      .prepare("SELECT order_doc_id FROM order_tokens WHERE order_doc_id = ? AND token_hash = ?")
      .bind(document.id, tokenHash)
      .first<{ order_doc_id: string }>();
    if (!match) throw new HttpError(403, "Invalid order tracking token.");
    return [document];
  }
  throw new HttpError(403, "Access denied.");
}

function sanitizeDocuments(collection: string, documents: StoredDocument[]) {
  if (collection === "settings") {
    return documents.map((document) => ({ id: document.id, data: safeSettings(document.data) }));
  }
  return documents;
}

export async function handleDataGet(context: FunctionContext) {
  return withErrors(async () => {
    const url = new URL(context.request.url);
    const collection = cleanCollection(url.searchParams.get("collection"));
    const id = url.searchParams.has("id") ? cleanId(url.searchParams.get("id")) : null;
    const constraints = parseConstraints(url.searchParams.get("constraints"));
    const identity = await identify(context.request, context.env.DB);
    const authorized = await authorizeRead(context.request, context.env.DB, collection, id, constraints, identity);
    let documents: StoredDocument[];
    if (authorized) {
      documents = await Promise.resolve(authorized) as StoredDocument[];
      if (!id) documents = applyConstraints(documents, constraints);
    } else if (id) {
      const document = await getDocument(context.env.DB, collection, id);
      documents = document ? [document] : [];
    } else {
      documents = applyConstraints(await listDocuments(context.env.DB, collection), constraints);
    }
    if (collection === "orders" && identity.customer && !identity.staff) {
      documents = documents.filter((document) => document.data.userId === identity.customer?.uid);
    }
    return jsonResponse({ docs: sanitizeDocuments(collection, documents) });
  });
}

function cleanProfileData(data: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  if ("name" in data) result.name = cleanString(data.name, 120, true);
  if ("email" in data) {
    const email = cleanString(data.email, 254).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Invalid email.");
    result.email = email;
  }
  if ("phone" in data) {
    const phone = cleanString(data.phone, 30).replace(/[\s()-]/g, "");
    if (phone && !/^\+?\d{7,15}$/.test(phone)) throw new HttpError(400, "Invalid phone.");
    result.phone = phone;
  }
  if ("locations" in data) {
    if (!Array.isArray(data.locations) || data.locations.length > 20) throw new HttpError(400, "Invalid locations.");
    result.locations = data.locations.map((value) => {
      const location = asRecord(value);
      return {
        id: cleanId(location.id),
        label: cleanString(location.label, 80, true),
        city: cleanString(location.city, 100, true),
        fullAddress: cleanString(location.fullAddress, 500, true),
        isDefault: Boolean(location.isDefault),
      };
    });
  }
  return result;
}

function cleanMessage(data: Record<string, unknown>) {
  const email = cleanString(data.email, 254).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Invalid email.");
  const subject = cleanString(data.subject, 50, true);
  if (!["product", "order", "complaint", "partnership", "other"].includes(subject)) {
    throw new HttpError(400, "Invalid subject.");
  }
  return {
    name: cleanString(data.name, 120, true),
    email,
    subject,
    message: cleanString(data.message, 5000, true),
    createdAt: new Date().toISOString(),
    status: "new",
  };
}

function cleanNewsletter(data: Record<string, unknown>) {
  const email = cleanString(data.email, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Invalid email.");
  return { email, subscribedAt: new Date().toISOString() };
}

function randomId(prefix = "") {
  return `${prefix}${bytesToBase64Url(randomBytes(18))}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isOfferActive(offer: Record<string, unknown>, now = Date.now()) {
  const start = typeof offer.startDate === "string" ? Date.parse(offer.startDate) : null;
  const end = typeof offer.endDate === "string" ? Date.parse(offer.endDate) : null;
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return (start === null || start <= now) && (end === null || end >= now);
}

function baseProductId(itemId: string) {
  for (const separator of ["__combo__", "__gift__"]) {
    const index = itemId.lastIndexOf(separator);
    if (index >= 0) return itemId.slice(0, index);
  }
  return itemId;
}

function offerQualifies(
  offer: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
  products: Map<string, Record<string, unknown>>,
  subtotal: number,
  now = Date.now()
) {
  if (!isOfferActive(offer, now)) return false;
  const sections = Array.isArray(offer.targetSections)
    ? offer.targetSections.filter((value): value is string => typeof value === "string")
    : [];
  if (sections.length) {
    const target = new Set(sections);
    const metrics = items.reduce<{ amount: number; quantity: number }>(
      (result, item) => {
        const product = products.get(baseProductId(String(item.id)));
        if (!product || !target.has(String(product.category))) return result;
        return {
          amount: result.amount + Number(item.price) * Number(item.quantity),
          quantity: result.quantity + Number(item.quantity),
        };
      },
      { amount: 0, quantity: 0 }
    );
    return Number(offer.minQuantity ?? 0) > 0
      ? metrics.quantity >= Number(offer.minQuantity)
      : metrics.amount >= Number(offer.minAmount ?? 0);
  }
  return subtotal >= Number(offer.minAmount ?? 0);
}

export function calculateAuthoritativeOrder(
  submitted: Record<string, unknown>,
  catalogDocuments: StoredDocument[],
  offerDocuments: StoredDocument[],
  now = Date.now()
) {
  if (!Array.isArray(submitted.items) || submitted.items.length < 1 || submitted.items.length > 100) {
    throw new HttpError(400, "Invalid order items.");
  }
  const products = new Map<string, Record<string, unknown>>(
    catalogDocuments.map((document) => [document.id, { ...document.data, id: document.id }])
  );
  const offers = new Map<string, Record<string, unknown>>(
    offerDocuments.map((document) => [document.id, { ...document.data, id: document.id }])
  );
  const rawItems = submitted.items.map((value) => {
    const item = asRecord(value);
    const id = cleanString(item.id, 240, true);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new HttpError(400, "Invalid item quantity.");
    return { id, quantity };
  });
  const regular = rawItems.filter((item) => !item.id.includes("__combo__") && !item.id.includes("__gift__"));
  const combos = rawItems.filter((item) => item.id.includes("__combo__"));
  const gifts = rawItems.filter((item) => item.id.includes("__gift__"));
  const authoritative: Array<Record<string, unknown>> = [];
  const appliedOffers: Array<Record<string, unknown>> = [];

  for (const item of regular) {
    const product = products.get(item.id);
    const price = Number(product?.price);
    if (!product || !Number.isFinite(price) || price < 0) throw new HttpError(409, "Cart contains a stale product.");
    authoritative.push({
      id: item.id,
      name: cleanString(product.name, 240, true),
      price: roundMoney(price),
      image: typeof product.image === "string" ? product.image : "",
      range: typeof product.range === "string" ? product.range : "",
      quantity: item.quantity,
    });
  }

  const comboGroups = new Map<string, Array<{ id: string; quantity: number }>>();
  for (const item of combos) {
    const separator = item.id.lastIndexOf("__combo__");
    if (separator <= 0) throw new HttpError(400, "Invalid combo item.");
    const offerId = item.id.slice(separator + "__combo__".length);
    comboGroups.set(offerId, [...(comboGroups.get(offerId) ?? []), item]);
  }
  for (const [offerId, items] of comboGroups) {
    const offer = offers.get(offerId);
    const pickCount = Number(offer?.pickCount);
    const comboPrice = Number(offer?.comboPrice);
    if (
      !offer ||
      offer.type !== "combo" ||
      !isOfferActive(offer, now) ||
      !Number.isInteger(pickCount) ||
      pickCount < 1 ||
      !Number.isFinite(comboPrice) ||
      comboPrice < 0 ||
      items.reduce((sum, item) => sum + item.quantity, 0) !== pickCount
    ) {
      throw new HttpError(409, "Combo offer is no longer valid.");
    }
    const eligible = new Set(
      Array.isArray(offer.eligibleProducts)
        ? offer.eligibleProducts.filter((value): value is string => typeof value === "string")
        : []
    );
    const selected: string[] = [];
    for (const item of items) {
      const productId = baseProductId(item.id);
      if (!eligible.has(productId) || !products.has(productId)) throw new HttpError(409, "Invalid combo selection.");
      for (let count = 0; count < item.quantity; count += 1) selected.push(productId);
    }
    if (offer.uniqueOnly && new Set(selected).size !== selected.length) {
      throw new HttpError(409, "Combo requires unique products.");
    }
    const unitPrice = comboPrice / pickCount;
    for (const item of items) {
      const productId = baseProductId(item.id);
      const product = products.get(productId)!;
      authoritative.push({
        id: `${productId}__combo__${offerId}`,
        name: `${cleanString(product.name, 240, true)} (عرض خاص)`,
        price: unitPrice,
        image: typeof product.image === "string" ? product.image : "",
        range: typeof product.range === "string" ? product.range : "",
        quantity: item.quantity,
      });
    }
    appliedOffers.push({ type: "combo", offerId, products: selected, comboPrice: roundMoney(comboPrice) });
  }

  const subtotal = roundMoney(
    authoritative.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  );
  const giftByOffer = new Map<string, { productId: string; quantity: number }>();
  for (const item of gifts) {
    const separator = item.id.lastIndexOf("__gift__");
    if (separator <= 0) throw new HttpError(400, "Invalid gift item.");
    const offerId = item.id.slice(separator + "__gift__".length);
    if (giftByOffer.has(offerId) || item.quantity !== 1) throw new HttpError(409, "Invalid gift quantity.");
    giftByOffer.set(offerId, { productId: baseProductId(item.id), quantity: item.quantity });
  }
  const qualifyingGiftOffers = Array.from(offers.entries()).filter(
    ([, offer]) => offer.type === "free_product" && offerQualifies(offer, authoritative, products, subtotal, now)
  );
  if (giftByOffer.size !== qualifyingGiftOffers.length) {
    throw new HttpError(409, "Free gift selection is stale.");
  }
  for (const [offerId, offer] of qualifyingGiftOffers) {
    const selection = giftByOffer.get(offerId);
    const eligible = new Set(
      Array.isArray(offer.eligibleProducts)
        ? offer.eligibleProducts.filter((value): value is string => typeof value === "string")
        : []
    );
    const product = selection ? products.get(selection.productId) : null;
    if (!selection || !product || !eligible.has(selection.productId)) throw new HttpError(409, "Invalid free gift.");
    authoritative.push({
      id: `${selection.productId}__gift__${offerId}`,
      name: `${cleanString(product.name, 240, true)} (هدية مجانية)`,
      price: 0,
      image: typeof product.image === "string" ? product.image : "",
      range: typeof product.range === "string" ? product.range : "",
      quantity: 1,
    });
    appliedOffers.push({
      type: "free_product",
      offerId,
      productId: selection.productId,
      productName: cleanString(product.name, 240, true),
    });
  }
  for (const [offerId, offer] of offers) {
    if (offer.type === "free_shipping" && offerQualifies(offer, authoritative, products, subtotal, now)) {
      appliedOffers.push({ type: "free_shipping", offerId });
    }
  }
  const submittedTotal = Number(submitted.total);
  if (!Number.isFinite(submittedTotal) || Math.round(submittedTotal * 100) !== Math.round(subtotal * 100)) {
    throw new HttpError(409, "Order total is stale.");
  }
  const purchasedProductIds = rawItems.map((item) => baseProductId(item.id));
  const isDemo =
    purchasedProductIds.length > 0 &&
    purchasedProductIds.every((productId) => products.get(productId)?.isDemo === true);
  return { items: authoritative, total: subtotal, appliedOffers, isDemo };
}

async function createOrder(
  request: Request,
  db: D1DatabaseLike,
  inputId: string | null,
  data: Record<string, unknown>,
  customer: FirebaseIdentity | null
) {
  if (inputId) throw new HttpError(400, "Order document ids are server generated.");
  const orderId = cleanString(data.orderId, 40, true).toUpperCase();
  if (!/^ZT-[A-Z0-9]{8,32}$/.test(orderId)) throw new HttpError(400, "Invalid order number.");
  const customerName = cleanString(data.customerName, 120, true);
  const customerPhone = cleanString(data.customerPhone, 30, true).replace(/[\s()-]/g, "");
  const city = cleanString(data.city, 100, true);
  const customerAddress = cleanString(data.customerAddress, 500, true);
  const notes = cleanString(data.notes, 2000);
  if (customerName.length < 2 || !/^\+?\d{7,15}$/.test(customerPhone) || customerAddress.length < 5) {
    throw new HttpError(400, "Invalid customer details.");
  }
  const [products, offers] = await Promise.all([listDocuments(db, "products"), listDocuments(db, "offers")]);
  const calculated = calculateAuthoritativeOrder(data, products, offers);
  const now = new Date().toISOString();
  const stableOrderData: Record<string, unknown> = {
    orderId,
    items: calculated.items,
    customerName,
    customerPhone,
    customerAddress,
    city,
    notes,
    total: calculated.total,
    status: "new",
    appliedOffers: calculated.appliedOffers,
    isDemo: calculated.isDemo,
    ...(customer ? { userId: customer.uid } : {}),
  };
  const orderData: Record<string, unknown> = { ...stableOrderData, date: now };
  const canonical = JSON.stringify(orderData);
  const bodyHash = await sha256(JSON.stringify(stableOrderData));
  const callerHash = await sha256(customer ? `uid:${customer.uid}` : `guest:${customerPhone}`);
  const existing = await db
    .prepare("SELECT order_doc_id, caller_hash, body_hash FROM order_idempotency WHERE order_id = ?")
    .bind(orderId)
    .first<{ order_doc_id: string; caller_hash: string; body_hash: string }>();
  if (existing) {
    if (existing.caller_hash !== callerHash || existing.body_hash !== bodyHash) {
      throw new HttpError(409, "Order number is already in use.");
    }
    const document = await getDocument(db, "orders", existing.order_doc_id);
    if (!document) throw new HttpError(409, "Order is unavailable.");
    return { id: document.id, data: document.data };
  }
  const documentId = randomId("ord_");
  const trackingToken = customer ? null : bytesToBase64Url(randomBytes(32));
  const statements = [
    db.prepare("INSERT INTO order_idempotency (order_id, order_doc_id, caller_hash, body_hash, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(orderId, documentId, callerHash, bodyHash, now),
    db.prepare("INSERT INTO documents (collection, id, data) VALUES ('orders', ?, ?)")
      .bind(documentId, canonical),
  ];
  if (trackingToken) {
    statements.push(
      db.prepare("INSERT INTO order_tokens (order_doc_id, token_hash, created_at) VALUES (?, ?, ?)")
        .bind(documentId, await sha256(trackingToken), now)
    );
  }
  if (customer) {
    const profile = await getDocument(db, "users", customer.uid);
    const profileData = profile?.data ?? {
      name: customer.name ?? customerName,
      email: customer.email ?? "",
      phone: customerPhone,
      createdAt: now,
      locations: [],
    };
    profileData.orders = Math.max(0, Math.floor(Number(profileData.orders) || 0)) + 1;
    statements.push(
      db.prepare(
        "INSERT INTO documents (collection, id, data) VALUES ('users', ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data"
      ).bind(customer.uid, JSON.stringify(profileData))
    );
  }
  try {
    await db.batch(statements);
  } catch (error) {
    const raced = await db
      .prepare("SELECT order_doc_id, caller_hash, body_hash FROM order_idempotency WHERE order_id = ?")
      .bind(orderId)
      .first<{ order_doc_id: string; caller_hash: string; body_hash: string }>();
    if (raced?.caller_hash === callerHash && raced.body_hash === bodyHash) {
      const document = await getDocument(db, "orders", raced.order_doc_id);
      if (document) return { id: document.id, data: document.data };
    }
    throw error;
  }
  return { id: documentId, data: orderData, ...(trackingToken ? { trackingToken } : {}) };
}

function stripForbiddenFields(data: Record<string, unknown>): Record<string, unknown> {
  const forbidden = new Set([
    "password", "passwordHash", "password_hash", "passwordSalt", "password_salt",
    "role", "owner", "ownerId", "userId", "isDemo", "trackingToken",
  ]);
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !forbidden.has(key))
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return [
            key,
            value.map((item) =>
              item && typeof item === "object" && !Array.isArray(item)
                ? stripForbiddenFields(item as Record<string, unknown>)
                : item
            ),
          ];
        }
        if (value && typeof value === "object") {
          return [key, stripForbiddenFields(value as Record<string, unknown>)];
        }
        return [key, value];
      })
  );
}

function resolveAdminSentinels(
  collection: string,
  data: Record<string, unknown>,
  existing: Record<string, unknown>
) {
  const incrementFields: Record<string, Set<string>> = {
    products: new Set(["reviews"]),
    heroDisplay: new Set(["order"]),
  };
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).__op === "increment"
      ) {
        const operation = value as Record<string, unknown>;
        const increment = Number(operation.value);
        if (
          !incrementFields[collection]?.has(key) ||
          !Number.isFinite(increment) ||
          Object.keys(operation).some((operationKey) => !["__op", "value"].includes(operationKey))
        ) {
          throw new HttpError(400, "Unsupported increment operation.");
        }
        const current = Number(existing[key] ?? 0);
        if (!Number.isFinite(current)) throw new HttpError(409, "Increment target is not numeric.");
        return [key, current + increment];
      }
      return [key, value];
    })
  );
}

async function saveWorker(
  db: D1DatabaseLike,
  id: string,
  data: Record<string, unknown>
) {
  const existing = await db
    .prepare("SELECT id, name, email, password_salt, password_hash, password_iterations, created_at, enabled FROM staff_accounts WHERE id = ? AND role = 'worker'")
    .bind(id)
    .first<Record<string, unknown>>();
  const name = cleanString(data.name ?? existing?.name, 120, true);
  const email = cleanString(data.email ?? existing?.email, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Invalid email.");
  const newPassword = typeof data.newPassword === "string" ? data.newPassword : "";
  const enabled = "enabled" in data
    ? Boolean(data.enabled)
    : newPassword
      ? true
      : existing
        ? Boolean(existing.enabled)
        : true;
  if (!existing && !newPassword) throw new HttpError(400, "newPassword is required.");
  if (newPassword && newPassword.length < 12) throw new HttpError(400, "Password must be at least 12 characters.");
  const password = newPassword
    ? await hashPassword(newPassword)
    : {
        salt: String(existing?.password_salt),
        hash: String(existing?.password_hash),
        iterations: Number(existing?.password_iterations),
      };
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      `INSERT INTO staff_accounts
       (id, username, email, name, role, password_salt, password_hash, password_iterations, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'worker', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET username = excluded.username, email = excluded.email,
         name = excluded.name, password_salt = excluded.password_salt,
         password_hash = excluded.password_hash, password_iterations = excluded.password_iterations,
         enabled = excluded.enabled, updated_at = excluded.updated_at`
    ).bind(
      id, email, email, name, password.salt, password.hash, password.iterations,
      enabled ? 1 : 0, String(existing?.created_at ?? now), now
    ),
    db.prepare(
      `INSERT INTO documents (collection, id, data) VALUES ('workers', ?, ?)
       ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data`
    ).bind(id, JSON.stringify({
      name,
      email,
      role: "worker",
      createdAt: String(existing?.created_at ?? now),
      disabled: !enabled,
    })),
    ...(!enabled && existing
      ? [db.prepare("UPDATE staff_sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL").bind(now, id)]
      : []),
  ]);
  const worker = await getWorker(db, id);
  if (!worker) throw new HttpError(500, "Worker could not be saved.");
  return worker;
}

function allowedOrderStatusTransition(current: unknown, next: unknown) {
  if (current === next) return true;
  const transitions: Record<string, string[]> = {
    new: ["processing", "declined"],
    processing: ["prepared", "declined"],
    prepared: ["out_for_delivery", "declined"],
    out_for_delivery: ["completed", "declined"],
    completed: [],
    declined: [],
  };
  return typeof current === "string" && typeof next === "string" && (transitions[current] ?? []).includes(next);
}

async function mutateDocument(
  method: string,
  request: Request,
  db: D1DatabaseLike,
  collection: string,
  id: string | null,
  data: Record<string, unknown>,
  merge: boolean,
  identity: Identity
) {
  if (collection === "orders" && method === "POST") {
    if (identity.staff) throw new HttpError(403, "Staff cannot create storefront orders.");
    return createOrder(request, db, id, data, identity.customer);
  }
  if (collection === "messages" && method === "POST" && !identity.staff) {
    const documentId = id ?? randomId("msg_");
    const saved = cleanMessage(data);
    await db.prepare("INSERT INTO documents (collection, id, data) VALUES ('messages', ?, ?)").bind(documentId, JSON.stringify(saved)).run();
    return { id: documentId, data: saved };
  }
  if (collection === "newsletter" && method === "POST" && !identity.staff) {
    const saved = cleanNewsletter(data);
    const documentId = id ?? encodeURIComponent(String(saved.email));
    await db.prepare(
      "INSERT INTO documents (collection, id, data) VALUES ('newsletter', ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data"
    ).bind(documentId, JSON.stringify(saved)).run();
    return { id: documentId, data: {} };
  }
  if (identity.staff?.role === "worker") {
    if (collection !== "orders" || method !== "PATCH" || !id) throw new HttpError(403, "Access denied.");
    const keys = Object.keys(data);
    if (keys.length !== 1 || keys[0] !== "status") throw new HttpError(403, "Workers may only update order status.");
    const existing = await getDocument(db, collection, id);
    if (!existing) throw new HttpError(404, "Document not found.");
    if (!allowedOrderStatusTransition(existing.data.status, data.status)) {
      throw new HttpError(409, "Invalid order status transition.");
    }
    const saved = { ...existing.data, status: data.status };
    await db.prepare("UPDATE documents SET data = ? WHERE collection = 'orders' AND id = ?")
      .bind(JSON.stringify(saved), id).run();
    return { id, data: saved };
  }
  if (identity.staff?.role === "admin" && adminCollection(collection)) {
    if (!id) id = randomId();
    if (collection === "workers") return saveWorker(db, id, data);
    if (collection === "orders") {
      if (method !== "PATCH") throw new HttpError(403, "Orders may only be updated.");
      const existing = await getDocument(db, collection, id);
      if (!existing) throw new HttpError(404, "Document not found.");
      const allowed = new Set(["status", "deliveryNotes", "deliveryBy", "deliveredAt"]);
      if (Object.keys(data).some((key) => !allowed.has(key))) throw new HttpError(403, "Protected order fields cannot be changed.");
      if ("status" in data && !allowedOrderStatusTransition(existing.data.status, data.status)) {
        throw new HttpError(409, "Invalid order status transition.");
      }
      const saved = { ...existing.data, ...data };
      await db.prepare("UPDATE documents SET data = ? WHERE collection = 'orders' AND id = ?")
        .bind(JSON.stringify(saved), id).run();
      return { id, data: saved };
    }
    const existing = merge ? await getDocument(db, collection, id) : null;
    const cleanData = collection === "users"
      ? cleanProfileData(data)
      : resolveAdminSentinels(collection, stripForbiddenFields(data), existing?.data ?? {});
    const saved = merge ? { ...(existing?.data ?? {}), ...cleanData } : cleanData;
    if (collection === "users") {
      saved.createdAt = existing?.data.createdAt ?? new Date().toISOString();
      saved.orders = Math.max(0, Math.floor(Number(existing?.data.orders) || 0));
    }
    await db.prepare(
      "INSERT INTO documents (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data"
    ).bind(collection, id, JSON.stringify(saved)).run();
    return { id, data: collection === "settings" ? safeSettings(saved) : saved };
  }
  if (collection === "users" && identity.customer) {
    if (!id || id !== identity.customer.uid || !["POST", "PATCH"].includes(method)) {
      throw new HttpError(403, "Access denied.");
    }
    const existing = await getDocument(db, collection, id);
    const cleanData = cleanProfileData(data);
    const saved = { ...(existing?.data ?? {}), ...cleanData };
    saved.createdAt = existing?.data.createdAt ?? new Date().toISOString();
    saved.orders = Math.max(0, Math.floor(Number(existing?.data.orders) || 0));
    await db.prepare(
      "INSERT INTO documents (collection, id, data) VALUES ('users', ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data"
    ).bind(id, JSON.stringify(saved)).run();
    return { id, data: saved };
  }
  throw new HttpError(403, "Access denied.");
}

export async function handleDataMutation(context: FunctionContext) {
  return withErrors(async () => {
    await requireMutationRequest(context.request);
    const body = asRecord(await readJson(context.request));
    const collection = cleanCollection(body.collection);
    const id = body.id === undefined ? null : cleanId(body.id);
    const data = asRecord(body.data);
    const merge = body.merge === true || context.request.method === "PATCH";
    const identity = await identify(context.request, context.env.DB);
    const result = await mutateDocument(
      context.request.method,
      context.request,
      context.env.DB,
      collection,
      id,
      data,
      merge,
      identity
    );
    return jsonResponse(result, context.request.method === "POST" ? 201 : 200);
  });
}

export async function handleDataDelete(context: FunctionContext) {
  return withErrors(async () => {
    await requireMutationRequest(context.request);
    const body = asRecord(await readJson(context.request));
    const collection = cleanCollection(body.collection);
    const id = cleanId(body.id);
    const identity = await identify(context.request, context.env.DB);
    if (identity.staff?.role !== "admin" || !adminCollection(collection)) throw new HttpError(403, "Access denied.");
    if (collection === "workers") {
      const now = new Date().toISOString();
      await context.env.DB.batch([
        context.env.DB.prepare("UPDATE staff_sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL").bind(now, id),
        context.env.DB.prepare("DELETE FROM staff_accounts WHERE id = ? AND role = 'worker'").bind(id),
        context.env.DB.prepare("DELETE FROM documents WHERE collection = 'workers' AND id = ?").bind(id),
      ]);
    } else if (collection === "orders") {
      await context.env.DB.batch([
        context.env.DB.prepare("DELETE FROM order_tokens WHERE order_doc_id = ?").bind(id),
        context.env.DB.prepare("DELETE FROM order_idempotency WHERE order_doc_id = ?").bind(id),
        context.env.DB.prepare("DELETE FROM documents WHERE collection = 'orders' AND id = ?").bind(id),
      ]);
    } else {
      await context.env.DB.prepare("DELETE FROM documents WHERE collection = ? AND id = ?").bind(collection, id).run();
    }
    return jsonResponse({ id, data: null });
  });
}

export async function handleBatch(context: FunctionContext) {
  return withErrors(async () => {
    await requireMutationRequest(context.request);
    const identity = await identify(context.request, context.env.DB);
    if (identity.staff?.role !== "admin") throw new HttpError(403, "Access denied.");
    const body = asRecord(await readJson(context.request));
    if (!Array.isArray(body.writes) || body.writes.length < 1 || body.writes.length > 50) {
      throw new HttpError(400, "Invalid batch.");
    }
    const statements: D1Statement[] = [];
    const response: StoredDocument[] = [];
    for (const rawWrite of body.writes) {
      const write = asRecord(rawWrite);
      const collection = cleanCollection(write.collection);
      const id = cleanId(write.id);
      if (!["products", "offers", "heroDisplay", "settings"].includes(collection)) {
        throw new HttpError(403, "Collection is not batch writable.");
      }
      const existing = write.merge === true ? await getDocument(context.env.DB, collection, id) : null;
      const data = resolveAdminSentinels(
        collection,
        stripForbiddenFields(asRecord(write.data)),
        existing?.data ?? {}
      );
      const saved = write.merge === true ? { ...(existing?.data ?? {}), ...data } : data;
      statements.push(
        context.env.DB.prepare(
          "INSERT INTO documents (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data"
        ).bind(collection, id, JSON.stringify(saved))
      );
      response.push({ id, data: collection === "settings" ? safeSettings(saved) : saved });
    }
    await context.env.DB.batch(statements);
    return jsonResponse({ docs: response });
  });
}

async function rateLimitState(db: D1DatabaseLike, bucket: string, now: Date) {
  const row = await db
    .prepare("SELECT window_started_at, failures, blocked_until FROM login_rate_limits WHERE bucket = ?")
    .bind(bucket)
    .first<{ window_started_at: string; failures: number; blocked_until: string | null }>();
  if (!row) return { failures: 0, blocked: false };
  const windowExpired = Date.parse(row.window_started_at) <= now.getTime() - 15 * 60 * 1000;
  return {
    failures: windowExpired ? 0 : Number(row.failures) || 0,
    blocked: Boolean(row.blocked_until && Date.parse(row.blocked_until) > now.getTime()),
  };
}

async function recordLoginFailure(db: D1DatabaseLike, buckets: string[], now: Date) {
  const rows = await Promise.all(
    buckets.map((bucket) =>
      db.prepare("SELECT window_started_at, failures, blocked_until FROM login_rate_limits WHERE bucket = ?")
        .bind(bucket)
        .first<{ window_started_at: string; failures: number; blocked_until: string | null }>()
    )
  );
  const statements = buckets.map((bucket, index) => {
    const row = rows[index];
    const stale = !row || Date.parse(row.window_started_at) <= now.getTime() - 15 * 60 * 1000;
    const failures = (stale ? 0 : Number(row.failures) || 0) + 1;
    const windowStarted = stale ? now.toISOString() : row.window_started_at;
    const blockedUntil = failures >= 5
      ? new Date(now.getTime() + 15 * 60 * 1000).toISOString()
      : stale
        ? null
        : row?.blocked_until ?? null;
    return db.prepare(
      `INSERT INTO login_rate_limits (bucket, window_started_at, failures, blocked_until)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(bucket) DO UPDATE SET window_started_at = excluded.window_started_at,
         failures = excluded.failures, blocked_until = excluded.blocked_until`
    ).bind(bucket, windowStarted, failures, blockedUntil);
  });
  await db.batch(statements);
}

export async function handleLogin(context: FunctionContext) {
  return withErrors(async () => {
    await requireMutationRequest(context.request);
    const body = asRecord(await readJson(context.request));
    const username = cleanString(body.username, 254, true).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length > 1024) throw new HttpError(400, "Invalid credentials.");
    const ipBucket = `ip:${await sha256(remoteIp(context.request))}`;
    const accountBucket = `account:${await sha256(username)}`;
    const now = new Date();
    const states = await Promise.all([
      rateLimitState(context.env.DB, ipBucket, now),
      rateLimitState(context.env.DB, accountBucket, now),
    ]);
    if (states.some((state) => state.blocked || state.failures >= 5)) {
      throw new HttpError(429, "Too many login attempts.");
    }
    const account = await context.env.DB
      .prepare(
        `SELECT id, username, email, name, role, password_salt, password_hash,
                password_iterations, enabled
         FROM staff_accounts WHERE username = ? OR email = ? LIMIT 1`
      )
      .bind(username, username)
      .first<Record<string, unknown>>();
    const dummy = {
      password_salt: "AAAAAAAAAAAAAAAAAAAAAA",
      password_hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      password_iterations: PBKDF2_ITERATIONS,
    };
    const source = account ?? dummy;
    const valid = await verifyPassword(
      password,
      String(source.password_salt),
      String(source.password_hash),
      Number(source.password_iterations)
    );
    if (!account || !valid || !Boolean(account.enabled) || !["admin", "worker"].includes(String(account.role))) {
      await recordLoginFailure(context.env.DB, [ipBucket, accountBucket], now);
      throw new HttpError(401, "Invalid username or password.");
    }
    const token = bytesToBase64Url(randomBytes(32));
    const tokenHash = await sha256(token);
    const expires = new Date(now.getTime() + SESSION_SECONDS * 1000);
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO staff_sessions (token_hash, account_id, created_at, expires_at, ip_hash, user_agent_hash) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        tokenHash,
        account.id,
        now.toISOString(),
        expires.toISOString(),
        await sha256(remoteIp(context.request)),
        await sha256(context.request.headers.get("User-Agent") ?? "")
      ),
      context.env.DB.prepare("DELETE FROM login_rate_limits WHERE bucket IN (?, ?)").bind(ipBucket, accountBucket),
    ]);
    const session = {
      id: String(account.id),
      role: account.role,
      name: account.name,
      email: account.email,
    };
    return jsonResponse(
      { session },
      200,
      {
        "Set-Cookie": `${STAFF_COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; Expires=${expires.toUTCString()}; HttpOnly; Secure; SameSite=Strict`,
      }
    );
  });
}

export async function handleLogout(context: FunctionContext) {
  return withErrors(async () => {
    await requireMutationRequest(context.request);
    const token = parseCookies(context.request).get(STAFF_COOKIE);
    if (token) {
      await context.env.DB
        .prepare("UPDATE staff_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
        .bind(new Date().toISOString(), await sha256(token))
        .run();
    }
    return jsonResponse(
      { session: null },
      200,
      {
        "Set-Cookie": `${STAFF_COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict`,
      }
    );
  });
}

export async function handleSession(context: FunctionContext) {
  return withErrors(async () => {
    const session = await getStaffSession(context.request, context.env.DB);
    return jsonResponse({ session });
  });
}

function startsWithBytes(data: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => data[offset + index] === value);
}

export function decodeAndValidateImage(image: unknown, mimeType: unknown) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(String(mimeType))) {
    throw new HttpError(400, "Unsupported image type.");
  }
  if (typeof image !== "string" || !image || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    throw new HttpError(400, "Invalid base64 image.");
  }
  const estimatedBytes = Math.floor((image.length * 3) / 4) - (image.endsWith("==") ? 2 : image.endsWith("=") ? 1 : 0);
  if (estimatedBytes < 1 || estimatedBytes > MAX_IMAGE_BYTES) {
    throw new HttpError(413, "Image exceeds 750 KB.");
  }
  let data: Uint8Array;
  try {
    const binary = atob(image);
    data = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new HttpError(400, "Invalid base64 image.");
  }
  if (data.byteLength !== estimatedBytes || data.byteLength > MAX_IMAGE_BYTES) {
    throw new HttpError(413, "Image exceeds 750 KB.");
  }
  const valid =
    (mimeType === "image/png" &&
      data.byteLength >= 12 &&
      startsWithBytes(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (mimeType === "image/jpeg" &&
      data.byteLength >= 4 &&
      startsWithBytes(data, [0xff, 0xd8, 0xff]) &&
      startsWithBytes(data, [0xff, 0xd9], data.byteLength - 2)) ||
    (mimeType === "image/webp" &&
      data.byteLength >= 16 &&
      startsWithBytes(data, [0x52, 0x49, 0x46, 0x46]) &&
      startsWithBytes(data, [0x57, 0x45, 0x42, 0x50], 8) &&
      ["VP8 ", "VP8L", "VP8X"].includes(
        String.fromCharCode(data[12], data[13], data[14], data[15])
      ));
  if (!valid) throw new HttpError(400, "Image content does not match its declared type.");
  return { contentType: String(mimeType), data };
}

export async function handleUpload(context: FunctionContext) {
  return withErrors(async () => {
    await requireMutationRequest(context.request);
    const session = await getStaffSession(context.request, context.env.DB);
    if (session?.role !== "admin") throw new HttpError(403, "Access denied.");
    const body = asRecord(await readJson(context.request, MAX_UPLOAD_BODY_BYTES));
    const image = decodeAndValidateImage(body.image, body.mimeType);
    const id = randomId("img_");
    await context.env.DB
      .prepare("INSERT INTO media (id, content_type, data, created_at) VALUES (?, ?, ?, ?)")
      .bind(id, image.contentType, image.data, new Date().toISOString())
      .run();
    return jsonResponse({ url: `/api/media/${id}` }, 201);
  });
}

export async function handleMediaGet(context: FunctionContext) {
  return withErrors(async () => {
    const id = cleanId(context.params?.id);
    const row = await context.env.DB
      .prepare("SELECT content_type, data FROM media WHERE id = ?")
      .bind(id)
      .first<{ content_type: string; data: ArrayBuffer | Uint8Array }>();
    if (!row || !["image/png", "image/jpeg", "image/webp"].includes(row.content_type)) {
      throw new HttpError(404, "Image not found.");
    }
    const body = row.data instanceof Uint8Array ? row.data : new Uint8Array(row.data);
    const responseBody = new Uint8Array(body).buffer;
    return new Response(responseBody, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": row.content_type,
        "Content-Length": String(body.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-site",
      },
    });
  });
}

async function withErrors(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error.status, error.message);
    console.error("Zitron API error", error);
    return errorResponse(500, "Internal server error.");
  }
}
