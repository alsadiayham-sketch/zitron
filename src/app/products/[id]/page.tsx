import ProductDetail from "./ProductDetail";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductDetail params={params} />;
}