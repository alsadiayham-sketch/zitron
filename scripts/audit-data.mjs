import { getD1Records } from "./d1-data.mjs";

async function main() {
  for (const name of ["products", "heroDisplay", "offers", "settings", "users", "orders", "workers", "messages", "newsletter"]) {
    const records = await getD1Records(name);
    console.log(JSON.stringify({ collection: name, count: records.length }));
    if (["products", "heroDisplay", "offers"].includes(name)) {
      for (const entry of records) {
        const data = entry.data;
        const urls = name === "products" ? [...new Set([data.image, ...(data.images ?? [])].filter(Boolean))] : name === "heroDisplay" ? [data.url] : [];
        for (const url of urls) {
          try {
            const response = await fetch(url.startsWith("/") ? `https://zitron.pages.dev${url}` : url, { signal: AbortSignal.timeout(15000) });
            console.log(JSON.stringify({ asset: url, status: response.status, type: response.headers.get("content-type") }));
            await response.body?.cancel();
          } catch (error) {
            console.log(JSON.stringify({ asset: url, error: error.message }));
            process.exitCode = 1;
          }
        }
      }
    }
  }
}
await main();
