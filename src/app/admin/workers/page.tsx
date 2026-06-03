"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { getAuthErrorMessage } from "@/context/AuthContext";
import { AdminCard, AdminEmptyState, AdminPageHeader, FieldLabel, LoadingState, TextInput } from "@/components/admin/AdminUI";
import { formatDate, type WorkerRecord } from "@/lib/admin";
import { auth, getCollection, getDocRef } from "@/lib/firebase";

type WorkerForm = {
  name: string;
  email: string;
  password: string;
};

const emptyWorker: WorkerForm = {
  name: "",
  email: "",
  password: "",
};

function createWorkerId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `worker-${Date.now()}`;
}

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<WorkerForm>(emptyWorker);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [resettingWorkerId, setResettingWorkerId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(getCollection("workers"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...(doc.data() as Omit<WorkerRecord, "id">), id: doc.id }));
      data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
      setWorkers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const workerCount = useMemo(() => workers.length, [workers]);

  const resetWorkerForm = () => {
    setForm(emptyWorker);
    setEditingWorkerId(null);
    setError("");
  };

  const openEdit = (worker: WorkerRecord) => {
    setForm({
      name: worker.name,
      email: worker.email,
      password: worker.password,
    });
    setEditingWorkerId(worker.id);
    setError("");
    setFeedback("");
  };

  const saveWorker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("يرجى تعبئة جميع حقول العامل.");
      return;
    }

    const existingWorker = editingWorkerId ? workers.find((worker) => worker.id === editingWorkerId) : undefined;
    const workerId = editingWorkerId ?? createWorkerId();

    try {
      setSaving(true);
      setError("");
      setFeedback("");
      await setDoc(
        getDocRef("workers", workerId),
        {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: "worker",
          createdAt: existingWorker?.createdAt ?? new Date().toISOString(),
        },
        { merge: true }
      );
      setFeedback(editingWorkerId ? "تم تحديث بيانات العامل بنجاح." : "تم إضافة العامل بنجاح.");
      resetWorkerForm();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "تعذر حفظ بيانات العامل حالياً.");
    } finally {
      setSaving(false);
    }
  };

  const removeWorker = async (worker: WorkerRecord) => {
    if (!window.confirm(`هل تريد حذف العامل "${worker.name}"؟`)) {
      return;
    }

    await deleteDoc(getDocRef("workers", worker.id));

    if (editingWorkerId === worker.id) {
      resetWorkerForm();
    }
  };

  const resetWorkerPassword = async (worker: WorkerRecord) => {
    if (!window.confirm(`هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى ${worker.email}؟`)) {
      return;
    }

    try {
      setResettingWorkerId(worker.id);
      setFeedback("");
      setError("");
      await sendPasswordResetEmail(auth, worker.email);
      setFeedback(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${worker.email}.`);
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setResettingWorkerId(null);
    }
  };

  if (loading) {
    return <LoadingState label="جاري تحميل العمال..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="إدارة العمال" description="أضف حسابات العمال ليتمكنوا من متابعة الطلبات والطباعة فقط." action={<div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">عدد العمال: {workerCount}</div>} />

      {feedback ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <AdminCard>
          <form onSubmit={saveWorker} className="space-y-4">
            <div><FieldLabel>اسم العامل</FieldLabel><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="الاسم الكامل" /></div>
            <div><FieldLabel>البريد الإلكتروني</FieldLabel><TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="worker@email.com" /></div>
            <div><FieldLabel>كلمة المرور</FieldLabel><TextInput type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="كلمة مرور بسيطة للعامل" /></div>
            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={saving} className="w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">{saving ? (editingWorkerId ? "جاري الحفظ..." : "جاري الإضافة...") : (editingWorkerId ? "حفظ التعديلات" : "إضافة عامل")}</button>
              {editingWorkerId ? <button type="button" onClick={resetWorkerForm} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">إلغاء</button> : null}
            </div>
          </form>
        </AdminCard>

        <AdminCard className="overflow-hidden">
          {workers.length === 0 ? (
            <AdminEmptyState title="لا يوجد عمال حتى الآن" description="أضف أول عامل ليتمكن من الوصول إلى صفحات الطلبات فقط." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-right">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">الاسم</th>
                    <th className="px-4 py-3">البريد الإلكتروني</th>
                    <th className="px-4 py-3">الدور</th>
                    <th className="px-4 py-3">تاريخ الإنشاء</th>
                    <th className="px-4 py-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {workers.map((worker) => (
                    <tr key={worker.id}>
                      <td className="px-4 py-4 font-semibold text-slate-900">{worker.name}</td>
                      <td className="px-4 py-4">{worker.email}</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">عامل</span></td>
                      <td className="px-4 py-4">{formatDate(worker.createdAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={() => openEdit(worker)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-100" aria-label="تعديل العامل">
                            <Pencil className="h-4 w-4" />تعديل
                          </button>
                          <button type="button" onClick={() => void resetWorkerPassword(worker)} disabled={resettingWorkerId === worker.id} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-3 py-2 text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60" aria-label="إعادة تعيين كلمة المرور">
                            <KeyRound className="h-4 w-4" />إعادة تعيين
                          </button>
                          <button type="button" onClick={() => void removeWorker(worker)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-rose-700 transition hover:bg-rose-50" aria-label="حذف العامل">
                            <Trash2 className="h-4 w-4" />حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
