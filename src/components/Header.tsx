"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import OffersBanner from "@/components/OffersBanner";

const productLinks = [
  { label: "العناية بالوجه", href: "/products?cat=face" },
  { label: "الحماية من الشمس", href: "/products?cat=sun" },
  { label: "العناية بالجسم", href: "/products?cat=body" },
  { label: "المنظفات", href: "/products?cat=hygiene" },
];
const skinLinks = [
  { label: "البشرة الجافة", href: "/products?skin=dry" },
  { label: "البشرة الدهنية", href: "/products?skin=oily" },
  { label: "البشرة الحساسة", href: "/products?skin=sensitive" },
  { label: "البشرة المختلطة", href: "/products?skin=combination" },
];

function NavigationDisclosure({ label, links }: { label: string; links: Array<{ label: string; href: string }> }) {
  return <details className="group relative">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">
      {label}<ChevronDown className="h-4 w-4 transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180" />
    </summary>
    <div className="absolute right-0 top-full z-50 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
      {links.map((link) => <Link key={link.href} href={link.href} className="block rounded-md px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--primary)]">{link.label}</Link>)}
      <Link href="/products" className="mt-1 block rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--surface-soft)]">عرض كل المنتجات</Link>
    </div>
  </details>;
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const { totalItems, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const accountHref = user ? "/account/profile" : "/account";

  return (
    <>
      <OffersBanner />
      <header className="sticky z-50 border-b border-[var(--border)] bg-[var(--surface)]" style={{ top: "var(--offers-banner-height, 0px)" }} onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          event.stopPropagation();
          setMobileOpen(false);
          mobileMenuButton.current?.focus();
        }
      }}>
        <div className="clinical-container">
          <div className="flex min-h-16 items-center gap-3">
            <button ref={mobileMenuButton} type="button" className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] lg:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="shrink-0" aria-label="الصفحة الرئيسية"><Image src="/images/zitron-logo.png" alt="ZITRON" width={128} height={44} className="h-9 w-auto sm:h-10" priority /></Link>
            <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
              <NavigationDisclosure label="المنتجات" links={productLinks} />
              <NavigationDisclosure label="حسب البشرة" links={skinLinks} />
              <Link href="/ranges" className="flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">المجموعات</Link>
              <Link href="/about" className="flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">من نحن</Link>
              <Link href="/contact" className="flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">تواصل</Link>
            </nav>
            <form action="/products" className="mr-auto hidden min-w-0 max-w-xs flex-1 xl:block">
              <label className="relative block"><span className="sr-only">ابحث عن منتج</span><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><input name="q" type="search" className="clinical-input h-10 w-full pr-9 text-sm" placeholder="ابحث عن منتج" /></label>
            </form>
            <div className="mr-auto flex items-center gap-1 xl:mr-0">
              <Link href="/products" className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--foreground)] hover:bg-[var(--surface-soft)] xl:hidden" aria-label="البحث"><Search className="h-5 w-5" /></Link>
              <Link href={accountHref} className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--foreground)] hover:bg-[var(--surface-soft)]" aria-label="حسابي"><User className="h-5 w-5" /></Link>
              <button type="button" onClick={() => setIsCartOpen(true)} className="relative flex h-11 w-11 items-center justify-center rounded-md text-[var(--foreground)] hover:bg-[var(--surface-soft)]" aria-label={`سلة التسوق، ${totalItems} عناصر`}>
                <ShoppingBag className="h-5 w-5" />{totalItems > 0 ? <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">{totalItems}</span> : null}
              </button>
            </div>
          </div>
          <form action="/products" className="pb-3 xl:hidden">
            <label className="relative block"><span className="sr-only">ابحث عن منتج</span><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><input name="q" type="search" className="clinical-input h-10 w-full pr-9 text-sm" placeholder="ابحث باسم المنتج أو المجموعة" /></label>
          </form>
        </div>
        {mobileOpen ? <div className="border-t border-[var(--border)] bg-[var(--surface)] lg:hidden"><nav id="mobile-navigation" className="clinical-container space-y-1 py-3" aria-label="التنقل على الهاتف">
          <Link href={accountHref} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-[var(--surface-soft)]">حسابي</Link>
          <details className="rounded-md border border-[var(--border)]"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold">المنتجات<ChevronDown className="h-4 w-4" /></summary><div className="border-t border-[var(--border)] p-2">{productLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-soft)]">{link.label}</Link>)}<Link href="/products" onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-[var(--primary)]">عرض كل المنتجات</Link></div></details>
          <details className="rounded-md border border-[var(--border)]"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold">حسب البشرة<ChevronDown className="h-4 w-4" /></summary><div className="border-t border-[var(--border)] p-2">{skinLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-soft)]">{link.label}</Link>)}</div></details>
          {[{ label: "المجموعات", href: "/ranges" }, { label: "من نحن", href: "/about" }, { label: "تواصل معنا", href: "/contact" }, { label: "متابعة الطلب", href: "/track" }].map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-[var(--surface-soft)]">{link.label}</Link>)}
        </nav></div> : null}
      </header>
    </>
  );
}
