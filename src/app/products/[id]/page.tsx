import ProductDetail from "./ProductDetail";

export function generateStaticParams() {
  // In production (static export), Cloudflare SPA fallback serves this page for any /products/[id].
  // The actual product data is fetched client-side from Firebase.
  return [{ id: "placeholder" }];
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductDetail params={params} />;
}