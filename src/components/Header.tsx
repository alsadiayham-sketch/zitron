"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X, Search, User, ShoppingBag, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import OffersBanner from "@/components/OffersBanner";

const navItems = [
  { label: "منتجاتنا", href: "#", submenu: [
    { title: "العناية بالوجه", items: [
      { label: "السيروم", href: "/products?cat=serums" },
      { label: "العناية النهارية", href: "/products?cat=day-care" },
      { label: "العناية بعامل الحماية", href: "/products?cat=spf" },
      { label: "العناية الملونة", href: "/products?cat=tinted" },
      { label: "العناية الليلية", href: "/products?cat=night-care" },
      { label: "اللوشن والبخاخات", href: "/products?cat=lotions" },
      { label: "الأقنعة والمقشرات", href: "/products?cat=masks" },
      { label: "محيط العين والشفاه", href: "/products?cat=eye-lip" },
    ]},
    { title: "العناية بالجسم", items: [
      { label: "العناية بالجسم", href: "/products?cat=body" },
      { label: "العناية باليدين", href: "/products?cat=hands" },
      { label: "العناية بالقدمين", href: "/products?cat=feet" },
    ]},
    { title: "النظافة", items: [
      { label: "مياه ميسيلار", href: "/products?cat=micellar" },
      { label: "المنظفات ومزيلات المكياج", href: "/products?cat=cleansers" },
      { label: "منظفات الجسم", href: "/products?cat=body-cleansers" },
      { label: "مزيلات العرق", href: "/products?cat=deodorants" },
      { label: "الشامبو", href: "/products?cat=shampoos" },
    ]},
    { title: "الحماية من الشمس", items: [{ label: "منتجات الحماية من الشمس", href: "/products?cat=sun" }]},
  ]},
  { label: "بشرتك", href: "#", submenu: [
    { title: "نوع البشرة", items: [
      { label: "البشرة الجافة", href: "/products?skin=dry" },
      { label: "البشرة الدهنية", href: "/products?skin=oily" },
      { label: "البشرة الحساسة", href: "/products?skin=sensitive" },
      { label: "البشرة المختلطة", href: "/products?skin=combination" },
      { label: "البشرة المعرضة لحب الشباب", href: "/products?skin=acne" },
    ]},
    { title: "المشكلات", items: [
      { label: "التصبغات", href: "/products?concern=pigmentation" },
      { label: "التجاعيد", href: "/products?concern=wrinkles" },
      { label: "الجفاف", href: "/products?concern=dryness" },
      { label: "الاحمرار", href: "/products?concern=redness" },
    ]},
  ]},
  { label: "مجموعاتنا", href: "/ranges" },
  { label: "التزاماتنا", href: "/about" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { totalItems, setIsCartOpen } = useCart();
  const { user } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <OffersBanner />
      <header className="sticky z-50 border-b border-gray-100 bg-white shadow-sm" style={{ top: "var(--offers-banner-height, 0px)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <button className="p-2 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="القائمة">{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
            <Link href="/" className="flex-shrink-0"><Image src="https://i.ibb.co/LX1svn0G/zitron-logo.png" alt="ZITRON" width={150} height={50} className="h-12 w-auto" priority /></Link>
            <nav className="hidden items-center gap-8 lg:flex">
              {navItems.map((item) => (
                <div key={item.label} className="group relative" onMouseEnter={() => setActiveSubmenu(item.label)} onMouseLeave={() => setActiveSubmenu(null)}>
                  <Link href={item.href} className="flex items-center gap-1 py-6 text-sm font-medium text-gray-700 transition-colors hover:text-[var(--primary)]">{item.label}{item.submenu ? <ChevronDown size={14} /> : null}</Link>
                  {item.submenu && activeSubmenu === item.label ? <div className="absolute right-0 top-full z-50 grid w-[600px] grid-cols-2 gap-6 rounded-b-lg border border-gray-100 bg-white p-6 shadow-xl">{item.submenu.map((section) => <div key={section.title}><h4 className="mb-3 text-sm font-bold text-[var(--primary)]">{section.title}</h4><ul className="space-y-2">{section.items.map((subItem) => <li key={subItem.label}><Link href={subItem.href} className="text-sm text-gray-600 transition-all hover:pr-2 hover:text-[var(--primary)]">{subItem.label}</Link></li>)}</ul></div>)}</div> : null}
                </div>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 transition-colors hover:text-[var(--primary)]" aria-label="بحث"><Search size={20} /></button>
              <Link href={user ? "/account/profile" : "/account"} className="hidden p-2 transition-colors hover:text-[var(--primary)] sm:block" aria-label="حسابي"><User size={20} /></Link>
              <button onClick={() => setIsCartOpen(true)} className="relative p-2 transition-colors hover:text-[var(--primary)]" aria-label="سلة التسوق"><ShoppingBag size={20} />{mounted && totalItems > 0 ? <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-white">{totalItems}</span> : null}</button>
            </div>
          </div>
        </div>
        {searchOpen ? <div className="animate-fadeIn border-t border-gray-100 bg-white px-4 py-4"><div className="mx-auto max-w-2xl"><div className="relative"><input type="text" placeholder="ابحث عن منتج..." className="w-full rounded-full border border-gray-200 py-3 px-6 pr-12 text-sm focus:border-[var(--primary)] focus:outline-none" autoFocus /><Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" /></div></div></div> : null}
        {mobileOpen ? <div className="animate-fadeIn max-h-[80vh] overflow-y-auto border-t border-gray-100 bg-white lg:hidden"><nav className="space-y-2 px-4 py-4"><Link href={user ? "/account/profile" : "/account"} className="block rounded-lg px-4 py-3 font-medium text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>حسابي</Link>{navItems.map((item) => <div key={item.label}><Link href={item.href} className="block rounded-lg px-4 py-3 font-medium text-gray-700 hover:bg-gray-50" onClick={() => !item.submenu && setMobileOpen(false)}>{item.label}</Link>{item.submenu ? <div className="mt-1 space-y-1 pr-4">{item.submenu.map((section) => <div key={section.title} className="mb-3"><p className="px-4 py-1 text-xs font-bold text-[var(--primary)]">{section.title}</p>{section.items.map((subItem) => <Link key={subItem.label} href={subItem.href} className="block px-6 py-2 text-sm text-gray-600 hover:text-[var(--primary)]" onClick={() => setMobileOpen(false)}>{subItem.label}</Link>)}</div>)}</div> : null}</div>)}</nav></div> : null}
      </header>
    </>
  );
}
