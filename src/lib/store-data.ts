"use client";

import { auth } from "@/lib/firebase";

export type DocumentData = Record<string, unknown>;
export type QueryConstraint =
  | { type: "where"; field: string; op: "=="; value: unknown }
  | { type: "orderBy"; field: string; direction: "asc" | "desc" }
  | { type: "limit"; count: number }
  | { type: "startAfter"; id: string };

export type CollectionReference = { kind: "collection"; collection: string };
export type DocumentReference = { kind: "document"; collection: string; id: string };
export type Query = { kind: "query"; collection: string; constraints: QueryConstraint[] };
type Source = CollectionReference | DocumentReference | Query;

export type QueryDocumentSnapshot<T = DocumentData> = {
  id: string;
  data: () => T;
  exists: () => true;
};

type Snapshot<T = DocumentData> = {
  docs: QueryDocumentSnapshot<T>[];
  size: number;
};

type DocumentSnapshot<T = DocumentData> = {
  id: string;
  data: () => T | undefined;
  exists: () => boolean;
};

type ApiResponse = { docs?: Array<{ id: string; data: unknown }>; error?: string; code?: string };
type DataDocument = { id: string; data: DocumentData };
type TrackingEntry = { id: string; orderId?: string; token: string };

const ORDER_TOKEN_STORAGE_KEY = "zitron-order-capabilities";
const POLL_INTERVAL = 9_000;
const subscriptions = new Set<{ collection: string; refresh: () => Promise<void> }>();

async function refreshCollection(collection: string) {
  await Promise.all([...subscriptions].filter((subscription) => subscription.collection === collection).map((subscription) => subscription.refresh()));
}

export function isDocumentData(value: unknown): value is DocumentData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class StoreApiError extends Error {
  constructor(message: string, public readonly status = 0, public readonly code?: string) {
    super(message);
    this.name = "StoreApiError";
  }
}

export function getCollection(name: string): CollectionReference {
  return { kind: "collection", collection: name };
}

export function getDocRef(collection: string, id: string): DocumentReference {
  return { kind: "document", collection, id };
}

export function where(field: string, op: "==", value: unknown): QueryConstraint {
  return { type: "where", field, op, value };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc"): QueryConstraint {
  return { type: "orderBy", field, direction };
}

export function limit(count: number): QueryConstraint {
  return { type: "limit", count };
}

export function startAfter(snapshot: Pick<QueryDocumentSnapshot, "id"> | string): QueryConstraint {
  return { type: "startAfter", id: typeof snapshot === "string" ? snapshot : snapshot.id };
}

export function query(source: CollectionReference | Query, ...constraints: QueryConstraint[]): Query {
  return {
    kind: "query",
    collection: source.collection,
    constraints: [...(source.kind === "query" ? source.constraints : []), ...constraints],
  };
}

function getTokenForRequest(collection: string, id?: string, constraints: QueryConstraint[] = []) {
  if (collection !== "orders" || typeof window === "undefined") return undefined;
  const entries = readTrackingEntries();
  const orderConstraint = constraints.find((constraint): constraint is Extract<QueryConstraint, { type: "where" }> =>
    constraint.type === "where" && constraint.field === "orderId"
  );
  const orderId = orderConstraint?.value;
  return entries.find((entry) => entry.id === id || (typeof orderId === "string" && entry.orderId === orderId))?.token;
}

function readTrackingEntries(): TrackingEntry[] {
  try {
    const raw = window.localStorage.getItem(ORDER_TOKEN_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is TrackingEntry =>
          entry && typeof entry.id === "string" && typeof entry.token === "string" && (!entry.orderId || typeof entry.orderId === "string"))
      : [];
  } catch {
    return [];
  }
}

export function rememberOrderTrackingToken(id: string, token?: string, orderId?: string) {
  if (!token || typeof window === "undefined") return;
  try {
    const entries = readTrackingEntries().filter((entry) => entry.id !== id && (!orderId || entry.orderId !== orderId));
    window.localStorage.setItem(ORDER_TOKEN_STORAGE_KEY, JSON.stringify([{ id, token, orderId }, ...entries].slice(0, 20)));
  } catch {
    // Order creation succeeds even when browser storage is unavailable.
  }
}

export function getOrderTrackingToken(orderId: string) {
  if (typeof window === "undefined") return undefined;
  return readTrackingEntries().find((entry) => entry.orderId === orderId)?.token;
}

export function setOrderTrackingTokenForLookup(orderId: string, token: string) {
  if (!token || typeof window === "undefined") return;
  try {
    const entries = readTrackingEntries().filter((entry) => entry.orderId !== orderId);
    window.localStorage.setItem(ORDER_TOKEN_STORAGE_KEY, JSON.stringify([{ id: `lookup:${orderId}`, orderId, token }, ...entries].slice(0, 20)));
  } catch {
    // A cross-device capability may still be supplied again by its URL.
  }
}

async function request(path: string, init: RequestInit = {}, token?: string) {
  await auth.authStateReady();
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Zitron-Request": "1",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      ...(token ? { "X-Zitron-Order-Token": token } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as ApiResponse & Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("zitron-admin-session-expired"));
    }
    throw new StoreApiError(typeof payload.error === "string" ? payload.error : "تعذر الاتصال بخدمة المتجر.", response.status, payload.code);
  }
  return payload;
}

export async function apiRequest(path: string, init: RequestInit = {}) {
  return request(path, init);
}

async function readSource(source: Source): Promise<DataDocument[]> {
  const id = source.kind === "document" ? source.id : undefined;
  const constraints = source.kind === "query" ? source.constraints : [];
  const parameters = new URLSearchParams({ collection: source.collection });
  if (id) parameters.set("id", id);
  if (constraints.length) parameters.set("constraints", JSON.stringify(constraints));
  const payload = await request(`/api/data?${parameters}`, {}, getTokenForRequest(source.collection, id, constraints));
  return (payload.docs ?? []).map((document) => {
    if (!isDocumentData(document.data)) {
      throw new StoreApiError("استجابت خدمة المتجر ببيانات غير صالحة.");
    }
    return { id: document.id, data: document.data };
  });
}

function documentSnapshot(id: string, data?: DocumentData): DocumentSnapshot {
  return { id, data: () => data, exists: () => Boolean(data) };
}

function querySnapshot(docs: Array<{ id: string; data: DocumentData }>): Snapshot {
  const items = docs.map((item) => ({ id: item.id, data: () => item.data, exists: () => true as const }));
  return { docs: items, size: items.length };
}

export async function getDoc(source: DocumentReference): Promise<DocumentSnapshot> {
  const docs = await readSource(source);
  const match = docs.find((doc) => doc.id === source.id);
  return documentSnapshot(source.id, match?.data);
}

export async function getDocs(source: CollectionReference | Query): Promise<Snapshot> {
  const docs = await readSource(source);
  if (source.collection === "orders") {
    for (const doc of docs) {
      const orderData = doc.data;
      const orderId = typeof orderData === "object" && orderData !== null && "orderId" in orderData && typeof orderData.orderId === "string"
        ? orderData.orderId
        : undefined;
      const token = getTokenForRequest(source.collection, undefined, source.kind === "query" ? source.constraints : []);
      if (token && orderId) rememberOrderTrackingToken(doc.id, token, orderId);
    }
  }
  return querySnapshot(docs);
}

export function onSnapshot(
  source: DocumentReference,
  next: (snapshot: DocumentSnapshot) => void,
  error?: (error: Error) => void,
): () => void;
export function onSnapshot(
  source: CollectionReference | Query,
  next: (snapshot: Snapshot) => void,
  error?: (error: Error) => void,
): () => void;
export function onSnapshot(
  source: Source,
  next: ((snapshot: DocumentSnapshot) => void) | ((snapshot: Snapshot) => void),
  error?: (error: Error) => void,
) {
  let stopped = false;
  let running: Promise<void> | undefined;
  let queued = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = (): Promise<void> => {
    if (stopped || document.visibilityState === "hidden") return Promise.resolve();
    if (running) {
      queued = true;
      return running;
    }
    if (timer) clearTimeout(timer);
    running = (async () => {
      do {
        queued = false;
        try {
          if (source.kind === "document") {
            const snapshot = await getDoc(source);
            if (!stopped) (next as (snapshot: DocumentSnapshot) => void)(snapshot);
          } else {
            const snapshot = await getDocs(source);
            if (!stopped) (next as (snapshot: Snapshot) => void)(snapshot);
          }
        } catch (reason) {
          if (!stopped) {
            const failure = reason instanceof Error ? reason : new Error("تعذر تحديث البيانات.");
            if (error) error(failure);
            else console.error(failure);
          }
        }
      } while (queued && !stopped && document.visibilityState !== "hidden");
    })().finally(() => {
      running = undefined;
      if (!stopped) timer = setTimeout(refresh, POLL_INTERVAL);
    });
    return running;
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      if (timer) clearTimeout(timer);
      void refresh();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  const subscription = { collection: source.collection, refresh };
  subscriptions.add(subscription);
  void refresh();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    subscriptions.delete(subscription);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export async function setDoc(ref: DocumentReference, data: object, options?: { merge?: boolean }) {
  await request("/api/data", {
    method: options?.merge ? "PATCH" : "POST",
    body: JSON.stringify(options?.merge ? { collection: ref.collection, id: ref.id, data, merge: true } : { collection: ref.collection, id: ref.id, data }),
  });
  await refreshCollection(ref.collection);
}

export async function updateDoc(ref: DocumentReference, data: object) {
  await request("/api/data", { method: "PATCH", body: JSON.stringify({ collection: ref.collection, id: ref.id, data, merge: true }) });
  await refreshCollection(ref.collection);
}

export async function addDoc(ref: CollectionReference, data: object) {
  const payload = await request("/api/data", { method: "POST", body: JSON.stringify({ collection: ref.collection, data }) });
  if (typeof payload.id !== "string" || !payload.id || !isDocumentData(payload.data)) {
    throw new StoreApiError("لم تُرجع الخدمة بيانات طلب صالحة.");
  }
  const trackingToken = typeof payload.trackingToken === "string" ? payload.trackingToken : undefined;
  if (ref.collection === "orders") rememberOrderTrackingToken(payload.id, trackingToken, typeof payload.data.orderId === "string" ? payload.data.orderId : undefined);
  await refreshCollection(ref.collection);
  return { id: payload.id, data: payload.data };
}

export async function deleteDoc(ref: DocumentReference) {
  await request("/api/data", { method: "DELETE", body: JSON.stringify({ collection: ref.collection, id: ref.id }) });
  await refreshCollection(ref.collection);
}

export async function writeBatch(writes: Array<{ ref: DocumentReference; data: object; merge?: boolean }>) {
  await request("/api/batch", {
    method: "POST",
    body: JSON.stringify({ writes: writes.map(({ ref, data, merge }) => ({ collection: ref.collection, id: ref.id, data, merge })) }),
  });
  await Promise.all([...new Set(writes.map(({ ref }) => ref.collection))].map(refreshCollection));
}
