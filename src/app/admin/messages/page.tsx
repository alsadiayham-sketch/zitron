"use client";

import { useEffect, useMemo, useState } from "react";
import { MailCheck, MailOpen, RefreshCw, UsersRound } from "lucide-react";
import { onSnapshot, updateDoc } from "firebase/firestore";
import { AdminCard, AdminEmptyState, AdminPageHeader, LoadingState } from "@/components/admin/AdminUI";
import { formatDate, getErrorMessage } from "@/lib/admin";
import { getCollection, getDocRef } from "@/lib/firebase";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt?: string;
  status?: "new" | "handled";
};

type NewsletterSubscriber = {
  id: string;
  email: string;
  subscribedAt?: string;
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [newsletterLoading, setNewsletterLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingMessageId, setUpdatingMessageId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeMessages = onSnapshot(
      getCollection("messages"),
      (snapshot) => {
        setMessages(
          snapshot.docs
            .map((doc) => ({ ...(doc.data() as Omit<ContactMessage, "id">), id: doc.id }))
            .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        );
        setMessagesLoading(false);
      },
      () => {
        setError("تعذر تحميل رسائل العملاء حالياً. حدّث الصفحة وحاول مرة أخرى.");
        setMessagesLoading(false);
      }
    );

    const unsubscribeNewsletter = onSnapshot(
      getCollection("newsletter"),
      (snapshot) => {
        setSubscribers(
          snapshot.docs
            .map((doc) => ({ ...(doc.data() as Omit<NewsletterSubscriber, "id">), id: doc.id }))
            .sort((a, b) => new Date(b.subscribedAt ?? 0).getTime() - new Date(a.subscribedAt ?? 0).getTime())
        );
        setNewsletterLoading(false);
      },
      () => {
        setError("تعذر تحميل مشتركي النشرة البريدية حالياً. حدّث الصفحة وحاول مرة أخرى.");
        setNewsletterLoading(false);
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeNewsletter();
    };
  }, []);

  const newMessageCount = useMemo(
    () => messages.filter((message) => message.status !== "handled").length,
    [messages]
  );

  const markHandled = async (message: ContactMessage) => {
    try {
      setError("");
      setUpdatingMessageId(message.id);
      await updateDoc(getDocRef("messages", message.id), { status: "handled" });
    } catch (nextError) {
      setError(getErrorMessage(nextError, "تعذر تحديث حالة الرسالة حالياً."));
    } finally {
      setUpdatingMessageId(null);
    }
  };

  if (messagesLoading || newsletterLoading) {
    return <LoadingState label="جاري تحميل الرسائل والمشتركين..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="الرسائل والنشرة البريدية"
        description="راجع رسائل نموذج التواصل ومشتركي النشرة البريدية الواردة من واجهة المتجر."
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminCard>
          <p className="text-sm text-slate-500">إجمالي الرسائل</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{messages.length}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">رسائل تحتاج متابعة</p>
          <p className="mt-3 text-3xl font-bold text-[var(--primary)]">{newMessageCount}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">مشتركو النشرة</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{subscribers.length}</p>
        </AdminCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <AdminCard>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">رسائل العملاء</h2>
              <p className="mt-1 text-sm text-slate-500">حدّث حالة الرسالة بعد متابعتها.</p>
            </div>
            <MailOpen className="h-5 w-5 text-[var(--primary)]" />
          </div>

          {messages.length === 0 ? (
            <AdminEmptyState title="لا توجد رسائل بعد" description="ستظهر هنا الرسائل المرسلة من صفحة التواصل." />
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const handled = message.status === "handled";
                const isUpdating = updatingMessageId === message.id;

                return (
                  <article key={message.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{message.subject?.trim() || "رسالة بدون عنوان"}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${handled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {handled ? "تمت المعالجة" : "جديدة"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-700">{message.name || "عميل"}</p>
                        <p className="mt-1 text-sm text-slate-500">{message.email || "لا يوجد بريد إلكتروني"}</p>
                      </div>
                      <div className="text-sm text-slate-500">{formatDate(message.createdAt)}</div>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                      {message.message || "لا يوجد نص للرسالة."}
                    </p>

                    {!handled ? (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void markHandled(message)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                          {isUpdating ? "جاري التحديث..." : "وضع علامة تمت المعالجة"}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </AdminCard>

        <AdminCard>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">مشتركو النشرة</h2>
              <p className="mt-1 text-sm text-slate-500">قائمة القراءة فقط للمشتركين الحاليين.</p>
            </div>
            <UsersRound className="h-5 w-5 text-[var(--primary)]" />
          </div>

          {subscribers.length === 0 ? (
            <AdminEmptyState title="لا يوجد مشتركون بعد" description="ستظهر هنا عناوين البريد الإلكتروني المسجلة من تذييل المتجر." />
          ) : (
            <div className="divide-y divide-slate-100">
              {subscribers.map((subscriber) => (
                <div key={subscriber.id} className="py-4 first:pt-0">
                  <p className="break-all font-semibold text-slate-900">{subscriber.email}</p>
                  <p className="mt-1 text-sm text-slate-500">اشترك في {formatDate(subscriber.subscribedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </section>
    </div>
  );
}
