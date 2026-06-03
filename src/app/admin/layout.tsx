"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import {
  LayoutDashboard,
  Package,
  Images,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { getCollection } from "@/lib/firebase";
import {
  clearAdminSession,
  readAdminSession,
  subscribeToAdminAuth,
  type AdminRole,
  type WorkerRecord,
  writeAdminSession,
} from "@/lib/admin";

const ADMIN_USERNAME = "zitron";
const ADMIN_PASSWORD = "5555";

type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  roles: AdminRole[];
  children?: { href: string; label: string }[];
};

const navItems: NavItem[] = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/admin/products", label: "المنتجات", icon: Package, roles: ["admin"] },
  { href: "/admin/hero", label: "العرض الرئيسي", icon: Images, roles: ["admin"] },
  {
    href: "/admin/orders",
    label: "الطلبات",
    icon: ShoppingCart,
    roles: ["admin", "worker"],
    children: [
      { href: "/admin/orders/all", label: "كل الطلبات" },
      { href: "/admin/orders/search", label: "بحث عن طلب" },
    ],
  },
  { href: "/admin/users", label: "العملاء", icon: Users, roles: ["admin"] },
  { href: "/admin/workers", label: "العمال", icon: UserCog, roles: ["admin"] },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings, roles: ["admin"] },
];

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        writeAdminSession({ role: "admin", name: "مدير النظام" });
        onLogin();
        return;
      }

      const snapshot = await getDocs(query(getCollection("workers"), where("email", "==", username.trim().toLowerCase()), limit(1)));
      const workerDoc = snapshot.docs[0];
      const worker = workerDoc ? ({ ...(workerDoc.data() as Omit<WorkerRecord, "id">), id: workerDoc.id } as WorkerRecord) : null;

      if (worker && worker.password === password) {
        writeAdminSession({ role: "worker", name: worker.name, email: worker.email });
        onLogin();
        return;
      }

      setError("بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.");
    } catch {
      setError("تعذر تسجيل الدخول حالياً. حاول مرة أخرى بعد قليل.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(27,58,107,0.18),_transparent_45%),linear-gradient(180deg,#f8f4f0_0%,#f4f7fb_100%)] px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">بوابة إدارة ZITRON</h1>
          <p className="mt-2 text-sm text-slate-500">يمكن للمدير أو العمال تسجيل الدخول لإدارة الطلبات والعملاء والمحتوى.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">اسم المستخدم أو البريد الإلكتروني</label>
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder="أدخل اسم المستخدم أو البريد" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">كلمة المرور</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" placeholder="أدخل كلمة المرور" />
          </div>
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-[var(--primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">الوصول مخصص لإدارة المتجر والعمال فقط.</p>
      </div>
    </div>
  );
}

function SidebarLink({ href, label, icon: Icon, active, badgeCount, depth = 0, onNavigate }: { href: string; label: string; icon?: LucideIcon; active: boolean; badgeCount?: number; depth?: number; onNavigate?: () => void; }) {
  return (
    <Link href={href} onClick={onNavigate} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition ${depth === 0 ? "text-sm font-medium" : "mr-4 text-xs font-semibold"} ${active ? "bg-white text-[var(--primary)] shadow-sm" : "text-slate-600 hover:bg-white/80 hover:text-[var(--primary)]"}`}>
      <span className="flex items-center gap-3">{Icon ? <Icon className="h-5 w-5" /> : <span className="h-2 w-2 rounded-full bg-current/40" />}<span>{label}</span></span>
      {typeof badgeCount === "number" && badgeCount > 0 ? <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 text-xs font-bold text-white">{badgeCount}</span> : null}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isReady = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const session = useSyncExternalStore(subscribeToAdminAuth, () => readAdminSession(), () => null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    if (!session) {
      return;
    }

    const unsubscribe = onSnapshot(query(getCollection("orders"), where("status", "==", "new")), (snapshot) => {
      setNewOrdersCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [session]);

  useEffect(() => {
    if (session?.role === "worker" && !pathname.startsWith("/admin/orders")) {
      router.replace("/admin/orders");
    }
  }, [pathname, router, session?.role]);

  const visibleNavItems = useMemo(() => navItems.filter((item) => (session ? item.roles.includes(session.role) : false)), [session]);
  const currentSection = useMemo(() => {
    for (const item of visibleNavItems) {
      const activeChild = item.children?.find((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
      if (activeChild) return activeChild.label;
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return item.label;
    }
    return session?.role === "worker" ? "الطلبات" : "لوحة التحكم";
  }, [pathname, session?.role, visibleNavItems]);

  const logout = () => {
    clearAdminSession();
    setMobileMenuOpen(false);
  };

  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">جاري تجهيز لوحة الإدارة...</div>;
  }

  if (!session) {
    return <LoginScreen onLogin={() => setMobileMenuOpen(false)} />;
  }

  if (session.role === "worker" && !pathname.startsWith("/admin/orders")) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">جاري تحويلك إلى لوحة الطلبات...</div>;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f7fb_0%,#eef3f8_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 right-0 z-40 w-72 border-l border-white/70 bg-[#f8f4f0]/95 p-5 shadow-xl backdrop-blur transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
          <div className="flex h-full flex-col">
            <div className="rounded-[2rem] bg-[var(--primary)] p-5 text-white shadow-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">{session.role === "worker" ? "Worker" : "Admin"}</p>
              <h2 className="mt-3 text-2xl font-bold">ZITRON</h2>
              <p className="mt-2 text-sm text-white/80">مرحباً {session.name} — {session.role === "worker" ? "يمكنك متابعة الطلبات والطباعة." : "إدارة المحتوى والطلبات والعملاء بسهولة."}</p>
            </div>

            <nav className="mt-6 flex-1 space-y-2">
              {visibleNavItems.map((item) => {
                const parentActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <div key={item.href} className="space-y-2">
                    <SidebarLink href={item.href} label={item.label} icon={item.icon} active={parentActive} badgeCount={item.href === "/admin/orders" ? (session ? newOrdersCount : 0) : undefined} onNavigate={() => setMobileMenuOpen(false)} />
                    {item.children?.map((child) => (
                      <SidebarLink key={child.href} href={child.href} label={child.label} active={pathname === child.href || pathname.startsWith(`${child.href}/`)} depth={1} onNavigate={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                );
              })}
            </nav>

            <button type="button" onClick={logout} className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              <LogOut className="h-4 w-4" />تسجيل الخروج
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pr-72">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{session.role === "worker" ? "لوحة العامل" : "لوحة الإدارة"}</p>
                <h1 className="mt-1 text-lg font-bold text-slate-900">{currentSection}</h1>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen((value) => !value)} className="rounded-2xl border border-slate-200 p-3 text-slate-700 transition hover:bg-slate-100 lg:hidden" aria-label="القائمة">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      {mobileMenuOpen ? <button type="button" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="إغلاق القائمة" /> : null}
    </div>
  );
}
