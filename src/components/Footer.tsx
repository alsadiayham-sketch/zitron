"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type AdminSettings } from "@/lib/admin";
import { getDocRef, onSnapshot, setDoc } from "@/lib/store-data";

export default function Footer() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionResult, setSubscriptionResult] = useState("");

  useEffect(() => {
    return onSnapshot(getDocRef("settings", "config"), (snapshot) => {
      if (snapshot.exists()) setSettings({ ...DEFAULT_SETTINGS, ...(snapshot.data() as Partial<AdminSettings>) });
    });
  }, []);

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (subscribing) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setSubscribing(true);
    setSubscriptionResult("");
    try {
      await setDoc(getDocRef("newsletter", encodeURIComponent(normalized)), { email: normalized, subscribedAt: new Date().toISOString() });
      setEmail("");
      setSubscriptionResult("تم تسجيل اشتراكك بنجاح.");
    } catch (caught) {
      setSubscriptionResult(caught instanceof Error ? caught.message : "تعذر تسجيل الاشتراك. يرجى المحاولة مجدداً.");
    } finally {
      setSubscribing(false);
    }
  }

  return <footer className="mt-auto border-t border-[var(--border)] bg-[var(--primary-dark)] text-white">
    <div className="border-b border-white/15">
      <div className="clinical-container grid gap-5 py-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><h2 className="text-xl font-bold">النشرة البريدية</h2><p className="mt-1 text-sm leading-6 text-white/80">اشترك لتصلك تحديثات المتجر والعروض المتاحة.</p></div>
        <form onSubmit={subscribe} className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <label className="min-w-0 sm:w-80"><span className="sr-only">البريد الإلكتروني</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="البريد الإلكتروني" className="min-h-11 w-full rounded-md border border-white/30 bg-white px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]" /></label>
          <button disabled={subscribing} className="min-h-11 rounded-md bg-[var(--accent)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">{subscribing ? "جاري التسجيل..." : "اشترك"}</button>
        </form>
        {subscriptionResult ? <p role="status" className="text-sm text-white/90 lg:col-start-2">{subscriptionResult}</p> : null}
      </div>
    </div>
    <div className="clinical-container grid gap-8 py-9 sm:grid-cols-2 lg:grid-cols-4">
      <div><Image src="/images/zitron-logo.png" alt="ZITRON" width={128} height={44} className="h-10 w-auto" /><p className="mt-4 max-w-xs text-sm leading-7 text-white/75">متجر للعناية بالبشرة يسهّل الوصول إلى معلومات المنتجات والطلب بالدفع عند الاستلام.</p>{/^https?:\/\//.test(settings.instagramLink) ? <a href={settings.instagramLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-white hover:underline">إنستغرام</a> : null}</div>
      <FooterLinks title="التسوّق" links={[["المنتجات", "/products"], ["المجموعات", "/ranges"], ["حسب نوع البشرة", "/products?skin=sensitive"], ["متابعة الطلب", "/track"]]} />
      <FooterLinks title="المتجر" links={[["من نحن", "/about"], ["التزاماتنا", "/about#commitments"], ["تواصل معنا", "/contact"], ["الخصوصية وشروط الشراء", "/contact"]]} />
      <div><h3 className="font-bold">تواصل معنا</h3><ul className="mt-4 space-y-3 text-sm text-white/75"><li className="flex gap-2"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" /><span className="whitespace-pre-line">{settings.contactAddress}</span></li><li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-[var(--accent)]" /><span dir="ltr">{settings.contactPhone}</span></li><li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-[var(--accent)]" /><span>{settings.contactEmail}</span></li></ul></div>
    </div>
    <div className="border-t border-white/15"><div className="clinical-container flex flex-col gap-2 py-4 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} ZITRON. جميع الحقوق محفوظة.</span><span>الدفع عند الاستلام</span></div></div>
  </footer>;
}

function FooterLinks({ title, links }: { title: string; links: Array<[string, string]> }) {
  return <div><h3 className="font-bold">{title}</h3><ul className="mt-4 space-y-3">{links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-white/75 transition-colors hover:text-white hover:underline">{label}</Link></li>)}</ul></div>;
}
