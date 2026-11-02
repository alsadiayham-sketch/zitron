"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <>
      <a href="#main-content" className="skip-link">تجاوز القائمة إلى المحتوى</a>
      <Header />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">{children}</main>
      <Footer />
      <CartSidebar />
    </>
  );
}
