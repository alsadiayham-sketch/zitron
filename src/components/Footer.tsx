"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { getDocRef } from "@/lib/firebase";
import { DEFAULT_SETTINGS, type AdminSettings } from "@/lib/admin";

export default function Footer() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionResult, setSubscriptionResult] = useState("");

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (subscribing) return;
    setSubscribing(true);
    setSubscriptionResult("");
    try {
      const normalized = email.trim().toLowerCase();
      await setDoc(getDocRef("newsletter", encodeURIComponent(normalized)), { email: normalized, subscribedAt: new Date().toISOString() });
      setSubscriptionResult("تم تسجيل اشتراكك بنجاح.");
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscription failed:", error);
      setSubscriptionResult("تعذر تسجيل الاشتراك. يرجى المحاولة مجدداً.");
    } finally {
      setSubscribing(false);
    }
  }

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
          <form onSubmit={subscribe} className="max-w-md mx-auto flex flex-wrap gap-2">
            <input
              type="email"
              required
              aria-label="البريد الإلكتروني للنشرة"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="بريدك الإلكتروني"
              className="min-w-0 flex-1 bg-white rounded-full py-3 px-6 text-gray-800 text-sm focus:outline-none border-2 border-white/40 placeholder:text-gray-600"
            />
            <button disabled={subscribing} className="bg-[var(--accent)] hover:bg-[var(--gold)] text-[var(--primary-dark)] font-medium py-3 px-8 rounded-full transition-colors text-sm">
              {subscribing ? "جاري التسجيل..." : "اشترك"}
            </button>
          </form>
          {subscriptionResult && <p role="status" className="mt-4">{subscriptionResult}</p>}
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Image
              src="/images/zitron-logo.png"
              alt="ZITRON"
              width={130}
              height={45}
              className="h-10 w-auto mb-4"
            />
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              أول علامة تجارية للعناية بالبشرة أنشأها أطباء الجلدية، مستوحاة من
              الآليات البيولوجية للبشرة.
            </p>
            <div className="flex gap-4">
              {/^https?:\/\//.test(settings.instagramLink) && <a href={settings.instagramLink} className="text-white/80 hover:text-white transition-colors" aria-label="انستغرام" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>}
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
              <li><Link href="/contact" className="text-white/70 hover:text-white text-sm transition-colors">استفسارات الخصوصية</Link></li>
              <li><Link href="/contact" className="text-white/70 hover:text-white text-sm transition-colors">استفسارات شروط الشراء</Link></li>
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
            <span className="text-white/80 text-sm">الدفع عند الاستلام</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
