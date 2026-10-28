import { readFile } from "node:fs/promises";
import { initializeApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, terminate } from "firebase/firestore";

const source = await readFile(new URL("../src/lib/firebase.ts", import.meta.url), "utf8");
const config = Object.fromEntries([...source.matchAll(/^\s+(\w+): "([^"]+)",?$/gm)].map((match) => [match[1], match[2]]));
const db = getFirestore(initializeApp(config));
try {
  for (const name of ["products", "heroDisplay", "offers", "settings", "users", "orders", "workers"]) {
    const snapshot = await getDocs(collection(doc(db, "projects", "zitron"), name));
    console.log(JSON.stringify({ collection: name, count: snapshot.size }));
    if (["products", "heroDisplay", "offers"].includes(name)) {
      for (const entry of snapshot.docs) {
        const data = entry.data();
        console.log(JSON.stringify({ id: entry.id, ...data }));
        const urls = name === "products" ? [...new Set([data.image, ...(data.images ?? [])].filter(Boolean))] : name === "heroDisplay" ? [data.url] : [];
        for (const url of urls) {
          try {
            const response = await fetch(url.startsWith("/") ? `https://zitron.pages.dev${url}` : url, { signal: AbortSignal.timeout(15000) });
            console.log(JSON.stringify({ asset: url, status: response.status, type: response.headers.get("content-type") }));
            await response.body?.cancel();
          } catch (error) {
            console.log(JSON.stringify({ asset: url, error: error.message }));
          }
        }
      }
    }
  }
} finally {
  await terminate(db);
}
