"use client";

import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type AdminSettings } from "@/lib/admin";
import { addDoc, getCollection, getDocRef, onSnapshot } from "@/lib/store-data";

export default function ContactPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  useEffect(() => onSnapshot(getDocRef("settings", "config"), (snapshot) => setSettings(snapshot.exists() ? { ...DEFAULT_SETTINGS, ...(snapshot.data() as Partial<AdminSettings>) } : DEFAULT_SETTINGS)), []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (!formData.name.trim() || !formData.message.trim() || !formData.subject) { setResult("يرجى إدخال الاسم والموضوع والرسالة."); return; }
    setSending(true); setResult("");
    try {
      await addDoc(getCollection("messages"), { ...formData, name: formData.name.trim(), email: formData.email.trim(), message: formData.message.trim(), createdAt: new Date().toISOString(), status: "new" });
      setFormData({ name: "", email: "", subject: "", message: "" }); setResult("تم استلام رسالتك بنجاح.");
    } catch (caught) { setResult(caught instanceof Error ? caught.message : "تعذر إرسال الرسالة. حاول مجدداً أو تواصل عبر الهاتف."); } finally { setSending(false); }
  }
  const update = (key: keyof typeof formData, value: string) => setFormData((current) => ({ ...current, [key]: value }));

  return <><section className="border-b border-[var(--border)] bg-[var(--surface-soft)] py-8 sm:py-10"><div className="clinical-container"><p className="clinical-muted text-sm">تواصل معنا</p><h1 className="clinical-page-heading mt-2">كيف يمكننا مساعدتك؟</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">أرسل استفساراً عن منتج أو طلب، وسيتلقى فريق المتجر رسالتك.</p></div></section>
    <section className="py-7 sm:py-10"><div className="clinical-container grid gap-7 lg:grid-cols-[0.8fr_1.2fr]"><aside><h2 className="text-xl font-bold text-[var(--foreground)]">معلومات التواصل</h2><dl className="mt-5 space-y-4">{[[MapPin, "العنوان", settings.contactAddress], [Phone, "الهاتف", settings.contactPhone], [Mail, "البريد الإلكتروني", settings.contactEmail], [Clock, "ساعات العمل", settings.contactWorkHours]].map(([Icon, label, value]) => { const ContactIcon = Icon as typeof MapPin; return <div key={label as string} className="flex gap-3"><ContactIcon className="mt-1 h-5 w-5 shrink-0 text-[var(--accent)]" /><div><dt className="font-semibold text-[var(--foreground)]">{label as string}</dt><dd className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--muted)]" dir={label === "الهاتف" ? "ltr" : undefined}>{value as string}</dd></div></div>; })}</dl></aside>
      <div className="clinical-panel"><h2 className="text-xl font-bold text-[var(--foreground)]">أرسل رسالة</h2><form onSubmit={handleSubmit} className="mt-6 space-y-5"><div className="grid gap-5 sm:grid-cols-2"><Field label="الاسم الكامل *"><input required value={formData.name} onChange={(event) => update("name", event.target.value)} className="clinical-input w-full" placeholder="أدخل اسمك" /></Field><Field label="البريد الإلكتروني *"><input required type="email" value={formData.email} onChange={(event) => update("email", event.target.value)} className="clinical-input w-full" placeholder="example@email.com" dir="ltr" /></Field></div><Field label="الموضوع *"><select required value={formData.subject} onChange={(event) => update("subject", event.target.value)} className="clinical-input w-full"><option value="">اختر الموضوع</option><option value="product">استفسار عن منتج</option><option value="order">استفسار عن طلب</option><option value="complaint">شكوى</option><option value="partnership">شراكة</option><option value="other">أخرى</option></select></Field><Field label="الرسالة *"><textarea required rows={6} value={formData.message} onChange={(event) => update("message", event.target.value)} className="clinical-input w-full resize-y" placeholder="اكتب رسالتك هنا..." /></Field><button disabled={sending} className="clinical-button inline-flex min-h-11 items-center gap-2 px-5 disabled:cursor-not-allowed disabled:opacity-60"><Send className="h-4 w-4" />{sending ? "جاري الإرسال..." : "إرسال الرسالة"}</button>{result ? <p role="status" className="text-sm text-[var(--muted)]">{result}</p> : null}</form></div></div></section>
    <section className="border-t border-[var(--border)] bg-[var(--surface-soft)] py-8 sm:py-10"><div className="clinical-container max-w-4xl"><h2 className="text-2xl font-bold text-[var(--foreground)]">أسئلة شائعة</h2><div className="mt-5 space-y-3">{faqs.map((faq) => <details key={faq.question} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"><summary className="cursor-pointer font-semibold text-[var(--foreground)]">{faq.question}</summary><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{faq.answer}</p></details>)}</div></div></section></>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{label}</span>{children}</label>; }
const faqs = [{ question: "كيف أتابع طلبي؟", answer: "استخدم صفحة متابعة الطلب وأدخل رقم الطلب والبيانات المطلوبة." }, { question: "هل يمكنني الاستفسار عن منتج؟", answer: "نعم، اختر «استفسار عن منتج» في النموذج وأضف اسم المنتج في رسالتك." }, { question: "كيف أغيّر عنواني؟", answer: "يمكن للعملاء المسجلين إدارة العناوين من صفحة الحساب." }];
