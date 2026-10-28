import ProductPage from "@/components/ProductPage";

export function generateStaticParams() {
  return [{ id: ["placeholder"] }];
}

export default function Page() {
  return <ProductPage />;
}