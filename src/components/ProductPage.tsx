"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ProductDetailClient from "@/app/products/[...id]/ProductDetailClient";

function ProductRoute() {
  const search = useSearchParams();
  const pathname = usePathname();
  const id = (search.get("id") ?? (pathname.startsWith("/products/") ? decodeURIComponent(pathname.slice(10)) : "")).replace(/\/+$/, "");
  return <ProductDetailClient key={id} id={id} />;
}

export default function ProductPage() {
  return <Suspense fallback={<p role="status" className="p-12 text-center">جاري تحميل المنتج...</p>}><ProductRoute /></Suspense>;
}
