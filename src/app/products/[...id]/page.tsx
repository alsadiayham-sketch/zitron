import ProductDetail from "./ProductDetail";

export function generateStaticParams() {
  return [{ id: ["placeholder"] }];
}

export default function Page({ params }: { params: Promise<{ id: string[] }> }) {
  // Wrap the array param into a single-string promise for ProductDetail
  const wrappedParams = params.then((p) => ({ id: p.id[0] ?? "" }));
  return <ProductDetail params={wrappedParams} />;
}