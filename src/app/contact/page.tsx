"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, Clock } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">اتصل بنا</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            نسعد بتواصلكم معنا. فريقنا جاهز للإجابة على جميع استفساراتكم
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--primary)] mb-6">
                  معلومات التواصل
                </h2>
                <p className="text-gray-600 mb-8">
                  لا تتردد في التواصل معنا عبر أي من الوسائل التالية. فريق خدمة
                  العملاء متاح لمساعدتك.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--primary)] mb-1">العنوان</h3>
                    <p className="text-gray-600 text-sm">
                      طريق الملك فهد، حي العليا
                      <br />
                      الرياض، المملكة العربية السعودية
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--primary)] mb-1">الهاتف</h3>
                    <p className="text-gray-600 text-sm" dir="ltr">+966 11 234 5678</p>
                    <p className="text-gray-600 text-sm" dir="ltr">+966 50 123 4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--primary)] mb-1">البريد الإلكتروني</h3>
                    <p className="text-gray-600 text-sm">info@zitron.com</p>
                    <p className="text-gray-600 text-sm">support@zitron.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--primary)] mb-1">ساعات العمل</h3>
                    <p className="text-gray-600 text-sm">الأحد - الخميس: 9:00 ص - 6:00 م</p>
                    <p className="text-gray-600 text-sm">الجمعة - السبت: مغلق</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-[var(--primary)] mb-6">
                  أرسل لنا رسالة
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم الكامل *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] text-sm"
                        placeholder="أدخل اسمك"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البريد الإلكتروني *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] text-sm"
                        placeholder="example@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الموضوع *
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] text-sm"
                    >
                      <option value="">اختر الموضوع</option>
                      <option value="product">استفسار عن منتج</option>
                      <option value="order">استفسار عن طلب</option>
                      <option value="complaint">شكوى</option>
                      <option value="partnership">شراكة</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الرسالة *
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-[var(--primary)] text-sm resize-none"
                      placeholder="اكتب رسالتك هنا..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium py-3 px-8 rounded-full transition-colors"
                  >
                    <Send size={16} />
                    إرسال الرسالة
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[var(--secondary)] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[var(--primary)] text-center mb-12">
            الأسئلة الشائعة
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="bg-white rounded-xl p-6 group cursor-pointer"
              >
                <summary className="font-bold text-[var(--primary)] list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-[var(--primary)] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-gray-600 text-sm mt-4 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const faqs = [
  {
    q: "ما هي مدة الشحن؟",
    a: "يتم شحن الطلبات خلال 24-48 ساعة عمل. التوصيل داخل المملكة العربية السعودية يستغرق 2-5 أيام عمل.",
  },
  {
    q: "هل يمكنني إرجاع المنتجات؟",
    a: "نعم، يمكنك إرجاع المنتجات غير المستخدمة خلال 14 يوماً من تاريخ الاستلام. يجب أن تكون المنتجات في عبواتها الأصلية.",
  },
  {
    q: "هل منتجاتكم مناسبة للبشرة الحساسة؟",
    a: "نعم، جميع منتجاتنا مختبرة تحت إشراف أطباء الجلدية ومصممة خصيصاً لتناسب جميع أنواع البشرة بما في ذلك البشرة الحساسة.",
  },
  {
    q: "هل تقدمون عينات مجانية؟",
    a: "نعم، مع كل طلب بقيمة 39 شيكل أو أكثر، يمكنك اختيار عينتين مجانيتين من مجموعة مختارة من منتجاتنا.",
  },
  {
    q: "كيف يمكنني تتبع طلبي؟",
    a: "بعد شحن طلبك، ستتلقى بريداً إلكترونياً يحتوي على رقم التتبع ورابط لتتبع شحنتك.",
  },
];
