"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { Eye, KeyRound, Pencil, Trash2 } from "lucide-react";
import { auth, getCollection, getDocRef } from "@/lib/firebase";
import { formatDate, type AdminUser } from "@/lib/admin";
import { getAuthErrorMessage } from "@/context/AuthContext";
import {
  AdminCard,
  AdminEmptyState,
  AdminModal,
  AdminPageHeader,
  FieldLabel,
  LoadingState,
  TextInput,
} from "@/components/admin/AdminUI";

const emptyUser: AdminUser = {
  id: "",
  name: "",
  email: "",
  phone: "",
  createdAt: "",
  orders: 0,
  locations: [],
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<AdminUser>(emptyUser);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(getCollection("users"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...(doc.data() as Omit<AdminUser, "id">), id: doc.id }));
      data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
      setUsers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalOrders = useMemo(() => users.reduce((sum, user) => sum + Number(user.orders || 0), 0), [users]);

  const openEdit = (user: AdminUser) => {
    setForm(user);
    setFormError("");
    setIsEditOpen(true);
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("يرجى إدخال اسم العميل.");
      return;
    }

    try {
      setIsSaving(true);
      await setDoc(
        getDocRef("users", form.id),
        {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          createdAt: form.createdAt || new Date().toISOString(),
        },
        { merge: true }
      );
      setIsEditOpen(false);
      setFeedback("تم تحديث بيانات العميل بنجاح.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "فشل حفظ بيانات العميل.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`هل تريد حذف العميل "${user.name}"؟`)) return;
    await deleteDoc(getDocRef("users", user.id));
    if (selectedUser?.id === user.id) setSelectedUser(null);
  };

  const resetPassword = async (user: AdminUser) => {
    if (!user.email) {
      setFeedback("لا يوجد بريد إلكتروني مسجل لهذا العميل.");
      return;
    }

    if (!window.confirm(`هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى ${user.email}؟`)) {
      return;
    }

    try {
      setResettingUserId(user.id);
      await sendPasswordResetEmail(auth, user.email);
      setFeedback(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${user.email}.`);
    } catch (error) {
      setFeedback(getAuthErrorMessage(error));
    } finally {
      setResettingUserId(null);
    }
  };

  if (loading) {
    return <LoadingState label="جاري تحميل العملاء..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="إدارة العملاء" description="اعرض بيانات المستخدمين، حدّث معلومات التواصل، وأرسل روابط إعادة تعيين كلمة المرور عند الحاجة." action={<div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">عدد العملاء: {users.length}</div>} />

      {feedback ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminCard><p className="text-sm text-slate-500">إجمالي العملاء</p><p className="mt-3 text-3xl font-bold text-slate-900">{users.length}</p></AdminCard>
        <AdminCard><p className="text-sm text-slate-500">إجمالي الطلبات</p><p className="mt-3 text-3xl font-bold text-slate-900">{totalOrders}</p></AdminCard>
        <AdminCard><p className="text-sm text-slate-500">عملاء لديهم طلبات</p><p className="mt-3 text-3xl font-bold text-slate-900">{users.filter((user) => Number(user.orders || 0) > 0).length}</p></AdminCard>
      </section>

      <AdminCard className="overflow-hidden">
        {users.length === 0 ? (
          <AdminEmptyState title="لا يوجد عملاء حتى الآن" description="سيظهر العملاء هنا عند التسجيل أو تنفيذ أول طلب." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">البريد الإلكتروني</th>
                  <th className="px-4 py-3">الهاتف</th>
                  <th className="px-4 py-3">الطلبات</th>
                  <th className="px-4 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4 font-semibold text-slate-900">{user.name}</td>
                    <td className="px-4 py-4">{user.email || "—"}</td>
                    <td className="px-4 py-4">{user.phone || "—"}</td>
                    <td className="px-4 py-4">{user.orders || 0}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setSelectedUser(user)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900" aria-label="عرض العميل"><Eye className="h-4 w-4" /></button>
                        <button type="button" onClick={() => openEdit(user)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900" aria-label="تعديل العميل"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void resetPassword(user)} disabled={resettingUserId === user.id} className="rounded-xl border border-amber-200 p-2 text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60" aria-label="إعادة تعيين كلمة المرور"><KeyRound className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void deleteUser(user)} className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50" aria-label="حذف العميل"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminModal open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title="تفاصيل العميل" description="عرض بيانات العميل كما هي محفوظة في قاعدة البيانات." size="max-w-2xl">
        {selectedUser ? (
          <div className="grid gap-4 md:grid-cols-2">
            <AdminCard className="bg-slate-50"><p className="text-sm text-slate-500">الاسم</p><p className="mt-2 text-lg font-bold text-slate-900">{selectedUser.name || "—"}</p></AdminCard>
            <AdminCard className="bg-slate-50"><p className="text-sm text-slate-500">البريد الإلكتروني</p><p className="mt-2 text-lg font-bold text-slate-900">{selectedUser.email || "—"}</p></AdminCard>
            <AdminCard className="bg-slate-50"><p className="text-sm text-slate-500">رقم الهاتف</p><p className="mt-2 text-lg font-bold text-slate-900">{selectedUser.phone || "—"}</p></AdminCard>
            <AdminCard className="bg-slate-50"><p className="text-sm text-slate-500">تاريخ الإنشاء</p><p className="mt-2 text-lg font-bold text-slate-900">{formatDate(selectedUser.createdAt)}</p></AdminCard>
            <AdminCard className="bg-slate-50 md:col-span-2"><p className="text-sm text-slate-500">العناوين المحفوظة</p><p className="mt-2 text-lg font-bold text-slate-900">{selectedUser.locations?.length || 0}</p></AdminCard>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="تعديل بيانات العميل" description="حدّث معلومات التواصل المحفوظة لهذا العميل." size="max-w-2xl">
        <form onSubmit={saveUser} className="space-y-5">
          <div><FieldLabel>الاسم</FieldLabel><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
          <div><FieldLabel>البريد الإلكتروني</FieldLabel><TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div><FieldLabel>رقم الهاتف</FieldLabel><TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
          {formError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsEditOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">إلغاء</button>
            <button type="submit" disabled={isSaving} className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}</button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
