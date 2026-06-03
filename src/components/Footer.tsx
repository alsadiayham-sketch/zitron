"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";
import { onSnapshot } from "firebase/firestore";
import { getDocRef } from "@/lib/firebase";
import { DEFAULT_SETTINGS, type AdminSettings } from "@/lib/admin";

export default function Footer() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const unsubscribe = onSnapshot(getDocRef("settings", "config"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...(snapshot.data() as Partial<AdminSettings>) });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <footer className="bg-[var(--primary-dark)] text-white">
      {/* Newsletter */}
      <div className="bg-[var(--primary)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold mb-2">اشترك في نشرتنا الإخبارية</h3>
          <p className="text-white/80 mb-6">احصل على آخر الأخبار والعروض الحصرية</p>
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              className="flex-1 rounded-full py-3 px-6 text-gray-800 text-sm focus:outline-none border-2 border-white/40 placeholder:text-gray-500"
            />
            <button className="bg-[var(--accent)] hover:bg-[var(--gold)] text-white font-medium py-3 px-8 rounded-full transition-colors text-sm">
              اشترك
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Image
              src="https://i.ibb.co/LX1svn0G/zitron-logo.png"
              alt="ZITRON"
              width={130}
              height={45}
              className="h-10 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              أول علامة تجارية للعناية بالبشرة أنشأها أطباء الجلدية، مستوحاة من
              الآليات البيولوجية للبشرة.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-white/60 hover:text-white transition-colors" aria-label="فيسبوك">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors" aria-label="انستغرام">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors" aria-label="تويتر">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors" aria-label="يوتيوب">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.5 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-bold text-lg mb-4">منتجاتنا</h4>
            <ul className="space-y-3">
              <li><Link href="/products?cat=face" className="text-white/70 hover:text-white text-sm transition-colors">العناية بالوجه</Link></li>
              <li><Link href="/products?cat=body" className="text-white/70 hover:text-white text-sm transition-colors">العناية بالجسم</Link></li>
              <li><Link href="/products?cat=sun" className="text-white/70 hover:text-white text-sm transition-colors">الحماية من الشمس</Link></li>
              <li><Link href="/products?cat=hygiene" className="text-white/70 hover:text-white text-sm transition-colors">النظافة</Link></li>
              <li><Link href="/ranges" className="text-white/70 hover:text-white text-sm transition-colors">مجموعاتنا</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-lg mb-4">الشركة</h4>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-white/70 hover:text-white text-sm transition-colors">من نحن</Link></li>
              <li><Link href="/about#commitments" className="text-white/70 hover:text-white text-sm transition-colors">التزاماتنا</Link></li>
              <li><Link href="/about#science" className="text-white/70 hover:text-white text-sm transition-colors">لجنتنا العلمية</Link></li>
              <li><Link href="/contact" className="text-white/70 hover:text-white text-sm transition-colors">اتصل بنا</Link></li>
              <li><Link href="#" className="text-white/70 hover:text-white text-sm transition-colors">سياسة الخصوصية</Link></li>
              <li><Link href="#" className="text-white/70 hover:text-white text-sm transition-colors">الشروط والأحكام</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-4">تواصل معنا</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[var(--accent)] mt-1 flex-shrink-0" />
                <span className="text-white/70 text-sm">{settings.contactAddress}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-[var(--accent)] flex-shrink-0" />
                <span className="text-white/70 text-sm" dir="ltr">{settings.contactPhone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[var(--accent)] flex-shrink-0" />
                <span className="text-white/70 text-sm">{settings.contactEmail}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} ZITRON. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-white/60 text-xs font-bold border border-white/30 rounded px-2 py-1">VISA</span>
            <span className="text-white/60 text-xs font-bold border border-white/30 rounded px-2 py-1">MASTERCARD</span>
            <span className="text-white/60 text-xs font-bold border border-white/30 rounded px-2 py-1">MADA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
