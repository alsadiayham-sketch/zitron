"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { rawDb } from "@/lib/firebase";
import {
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  DollarSign,
  Globe,
  MessageCircle,
  Users,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";

// ─── Auth ────────────────────────────────────────────────────────────────────

const VALID_USERS = [
  { username: "ayham", password: "12344" },
  { username: "dana", password: "12344" },
  { username: "akram", password: "12344" },
];

const SESSION_KEY = "zitron_projects_session";

// ─── Types ───────────────────────────────────────────────────────────────────

type DealType = "buy" | "rent";
type ContactStatus = "not_contacted" | "contacted" | "replied" | "no_reply";
type InterestLevel = "unknown" | "interested" | "not_interested" | "negotiating";
type PaymentStatus = "not_started" | "partial" | "full" | "overdue";

interface Payment {
  id: string;
  amount: number;
  date: string;
  note: string;
}

interface Project {
  id: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  dealType: DealType;
  contactStatus: ContactStatus;
  interestLevel: InterestLevel;
  hasDomain: boolean;
  domainName: string;
  // Pricing
  totalPrice: number;
  // Buy-specific
  paymentStatus: PaymentStatus;
  // Rent-specific
  monthlyRent: number;
  rentDueDay: number; // day of month
  rentStartDate: string;
  // Payments
  payments: Payment[];
  // Meta
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  projectUrl: string;
  status: "active" | "completed" | "cancelled";
}

type ProjectFormData = Omit<Project, "id" | "createdAt" | "updatedAt" | "createdBy">;

const FIRESTORE_COLLECTION = "web_projects";

function getProjectsCollection() {
  return collection(rawDb, "projects", "zitron", FIRESTORE_COLLECTION);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalPaid(project: Project): number {
  return project.payments.reduce((sum, p) => sum + p.amount, 0);
}

function remaining(project: Project): number {
  if (project.dealType === "buy") {
    return Math.max(0, project.totalPrice - totalPaid(project));
  }
  return 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getNextRentDue(project: Project): string {
  if (project.dealType !== "rent" || !project.rentStartDate) return "";
  const now = new Date();
  const dueDay = project.rentDueDay || 1;
  let nextDue = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (nextDue <= now) {
    nextDue = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  }
  return nextDue.toISOString().split("T")[0];
}

// ─── Status Badges ───────────────────────────────────────────────────────────

const CONTACT_STATUS_CONFIG: Record<ContactStatus, { label: string; color: string; icon: typeof Check }> = {
  not_contacted: { label: "Not Contacted", color: "bg-gray-100 text-gray-700", icon: Clock },
  contacted: { label: "Contacted", color: "bg-blue-100 text-blue-700", icon: Phone },
  replied: { label: "Replied", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  no_reply: { label: "No Reply", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
};

const INTEREST_CONFIG: Record<InterestLevel, { label: string; color: string; icon: typeof Check }> = {
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-600", icon: Clock },
  interested: { label: "Interested", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  not_interested: { label: "Not Interested", color: "bg-rose-100 text-rose-700", icon: XCircle },
  negotiating: { label: "Negotiating", color: "bg-purple-100 text-purple-700", icon: TrendingUp },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  not_started: { label: "No Payment", color: "bg-gray-100 text-gray-600" },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700" },
  full: { label: "Paid in Full", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Overdue", color: "bg-rose-100 text-rose-700" },
};

// ─── Login Component ─────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const user = VALID_USERS.find(
      (u) => u.username === username.toLowerCase().trim() && u.password === password
    );
    if (user) {
      sessionStorage.setItem(SESSION_KEY, user.username);
      onLogin(user.username);
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Project Tracker</h1>
          <p className="mt-2 text-sm text-slate-400">Web Design Projects Management</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Username</label>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter password"
              />
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400 active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Payment Modal ───────────────────────────────────────────────────────────

function PaymentModal({
  project,
  onClose,
  onAddPayment,
}: {
  project: Project;
  onClose: () => void;
  onAddPayment: (projectId: string, payment: Omit<Payment, "id">) => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onAddPayment(project.id, { amount: Number(amount), date, note });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Record Payment — {project.name}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Price:</span>
            <span className="font-semibold">{formatCurrency(project.totalPrice)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-slate-500">Already Paid:</span>
            <span className="font-semibold text-green-600">{formatCurrency(totalPaid(project))}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-slate-500">Remaining:</span>
            <span className="font-semibold text-amber-600">{formatCurrency(remaining(project))}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount (ILS)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              placeholder="0"
              min="1"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              placeholder="e.g. First installment, cash"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400"
          >
            Record Payment
          </button>
        </form>

        {project.payments.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Payment History</h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {project.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-green-700">{formatCurrency(p.amount)}</span>
                    {p.note && <span className="ml-2 text-slate-500">— {p.note}</span>}
                  </div>
                  <span className="text-slate-400">{formatDate(p.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project Form Modal ──────────────────────────────────────────────────────

function ProjectFormModal({
  project,
  onClose,
  onSave,
  currentUser,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (data: ProjectFormData, id?: string) => void;
  currentUser: string;
}) {
  const isEdit = !!project;
  const [form, setForm] = useState<ProjectFormData>(() => {
    if (project) {
      const { id, createdAt, updatedAt, createdBy, ...rest } = project;
      return rest;
    }
    return {
      name: "",
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      dealType: "buy",
      contactStatus: "not_contacted",
      interestLevel: "unknown",
      hasDomain: false,
      domainName: "",
      totalPrice: 0,
      paymentStatus: "not_started",
      monthlyRent: 0,
      rentDueDay: 1,
      rentStartDate: "",
      payments: [],
      notes: "",
      projectUrl: "",
      status: "active",
    };
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form, project?.id);
    onClose();
  };

  const update = (partial: Partial<ProjectFormData>) => setForm((prev) => ({ ...prev, ...partial }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{isEdit ? "Edit Project" : "New Project"}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-2">
          {/* Project Info */}
          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-600">Project Info</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Project Name *</label>
                <input value={form.name} onChange={(e) => update({ name: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="e.g. Coffee Shop Website" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Project URL</label>
                <input value={form.projectUrl} onChange={(e) => update({ projectUrl: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                <select value={form.status} onChange={(e) => update({ status: e.target.value as Project["status"] })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Client Info */}
          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-600">Client Info</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Client Name</label>
                <input value={form.clientName} onChange={(e) => update({ clientName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="John Doe" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                <input value={form.clientPhone} onChange={(e) => update({ clientPhone: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="05x-xxx-xxxx" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                <input value={form.clientEmail} onChange={(e) => update({ clientEmail: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="client@email.com" />
              </div>
            </div>
          </fieldset>

          {/* Communication & Interest */}
          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-600">Communication</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Contact Status</label>
                <select value={form.contactStatus} onChange={(e) => update({ contactStatus: e.target.value as ContactStatus })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="not_contacted">Not Contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="replied">Replied</option>
                  <option value="no_reply">No Reply</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Interest Level</label>
                <select value={form.interestLevel} onChange={(e) => update({ interestLevel: e.target.value as InterestLevel })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="unknown">Unknown</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="negotiating">Negotiating</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Domain */}
          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-600">Domain</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="hasDomain" checked={form.hasDomain} onChange={(e) => update({ hasDomain: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-500" />
                <label htmlFor="hasDomain" className="text-sm text-slate-700">Client has a domain</label>
              </div>
              {form.hasDomain && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Domain Name</label>
                  <input value={form.domainName} onChange={(e) => update({ domainName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="example.com" />
                </div>
              )}
            </div>
          </fieldset>

          {/* Deal & Pricing */}
          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-600">Deal & Pricing</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Deal Type</label>
                <select value={form.dealType} onChange={(e) => update({ dealType: e.target.value as DealType })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="buy">Buy (One-time)</option>
                  <option value="rent">Rent (Monthly)</option>
                </select>
              </div>

              {form.dealType === "buy" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Total Price (ILS)</label>
                    <input type="number" value={form.totalPrice || ""} onChange={(e) => update({ totalPrice: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Payment Status</label>
                    <select value={form.paymentStatus} onChange={(e) => update({ paymentStatus: e.target.value as PaymentStatus })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="not_started">No Payment Yet</option>
                      <option value="partial">Partial Payment</option>
                      <option value="full">Paid in Full</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </>
              )}

              {form.dealType === "rent" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Monthly Rent (ILS)</label>
                    <input type="number" value={form.monthlyRent || ""} onChange={(e) => update({ monthlyRent: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Initial Setup Price (ILS)</label>
                    <input type="number" value={form.totalPrice || ""} onChange={(e) => update({ totalPrice: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Rent Due Day (of month)</label>
                    <input type="number" min="1" max="28" value={form.rentDueDay || ""} onChange={(e) => update({ rentDueDay: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="1" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Rent Start Date</label>
                    <input type="date" value={form.rentStartDate} onChange={(e) => update({ rentStartDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                </>
              )}
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
            <textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Any additional info..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400">
              {isEdit ? "Update Project" : "Create Project"}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-6 py-3 font-medium text-slate-600 transition hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

function StatsCards({ projects }: { projects: Project[] }) {
  const totalRevenue = projects.reduce((sum, p) => sum + totalPaid(p), 0);
  const pendingRevenue = projects.reduce((sum, p) => sum + remaining(p), 0);
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const interestedClients = projects.filter((p) => p.interestLevel === "interested" || p.interestLevel === "negotiating").length;

  const stats = [
    { label: "Total Received", value: formatCurrency(totalRevenue), icon: DollarSign, color: "from-emerald-500 to-teal-600" },
    { label: "Pending Revenue", value: formatCurrency(pendingRevenue), icon: TrendingUp, color: "from-amber-500 to-orange-600" },
    { label: "Active Projects", value: String(activeProjects), icon: Globe, color: "from-indigo-500 to-blue-600" },
    { label: "Interested Clients", value: String(interestedClients), icon: Users, color: "from-purple-500 to-pink-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-lg`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Project Row ─────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  onEdit,
  onDelete,
  onPayment,
  expanded,
  onToggle,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onPayment: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const contact = CONTACT_STATUS_CONFIG[project.contactStatus];
  const interest = INTEREST_CONFIG[project.interestLevel];
  const payment = PAYMENT_STATUS_CONFIG[project.paymentStatus];
  const paid = totalPaid(project);
  const rem = remaining(project);
  const progress = project.totalPrice > 0 ? Math.min(100, (paid / project.totalPrice) * 100) : 0;

  return (
    <div className={`rounded-2xl border transition ${project.status === "cancelled" ? "border-rose-200 bg-rose-50/50" : project.status === "completed" ? "border-emerald-200 bg-emerald-50/30" : "border-white/70 bg-white"} shadow-sm`}>
      {/* Main Row */}
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">{project.name}</h3>
            {project.projectUrl && (
              <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-indigo-500 hover:text-indigo-700">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-sm text-slate-500">{project.clientName || "No client"}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${contact.color}`}>
            <contact.icon className="h-3 w-3" />
            {contact.label}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${interest.color}`}>
            <interest.icon className="h-3 w-3" />
            {interest.label}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${project.dealType === "buy" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>
            {project.dealType === "buy" ? "Buy" : "Rent"}
          </span>
          {project.dealType === "buy" && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${payment.color}`}>
              {payment.label}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${project.hasDomain ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {project.hasDomain ? "Has Domain" : "No Domain"}
          </span>
        </div>

        {/* Price */}
        <div className="text-right min-w-[100px]">
          {project.dealType === "buy" ? (
            <p className="font-bold text-slate-900">{formatCurrency(project.totalPrice)}</p>
          ) : (
            <p className="font-bold text-slate-900">{formatCurrency(project.monthlyRent)}<span className="text-xs font-normal text-slate-500">/mo</span></p>
          )}
        </div>

        {/* Expand Toggle */}
        <button className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Client Details */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Client</h4>
              <div className="space-y-1 text-sm">
                {project.clientPhone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-3.5 w-3.5" /> {project.clientPhone}
                  </div>
                )}
                {project.clientEmail && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-3.5 w-3.5" /> {project.clientEmail}
                  </div>
                )}
                {project.hasDomain && project.domainName && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="h-3.5 w-3.5" /> {project.domainName}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Progress */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {project.dealType === "buy" ? "Payment Progress" : "Rent Info"}
              </h4>
              {project.dealType === "buy" ? (
                <div>
                  <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Paid: <strong className="text-green-600">{formatCurrency(paid)}</strong></span>
                    <span>Remaining: <strong className="text-amber-600">{formatCurrency(rem)}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-slate-600">
                  <p>Monthly: <strong>{formatCurrency(project.monthlyRent)}</strong></p>
                  <p>Due day: <strong>{project.rentDueDay}</strong> of each month</p>
                  {project.rentStartDate && <p>Started: <strong>{formatDate(project.rentStartDate)}</strong></p>}
                  {getNextRentDue(project) && <p>Next due: <strong className="text-amber-600">{formatDate(getNextRentDue(project))}</strong></p>}
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Payments</h4>
              {project.payments.length === 0 ? (
                <p className="text-sm text-slate-400">No payments recorded</p>
              ) : (
                <div className="space-y-1">
                  {project.payments.slice(-3).reverse().map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="font-medium text-green-700">{formatCurrency(p.amount)}</span>
                      <span className="text-slate-400">{formatDate(p.date)}</span>
                    </div>
                  ))}
                  {project.payments.length > 3 && <p className="text-xs text-slate-400">+{project.payments.length - 3} more</p>}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-sm text-slate-600">{project.notes}</p>
            </div>
          )}

          {/* Meta */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-400">
              Created by <strong>{project.createdBy}</strong> on {formatDate(project.createdAt)}
              {project.updatedAt !== project.createdAt && <> · Updated {formatDate(project.updatedAt)}</>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); onPayment(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100">
                <DollarSign className="h-3.5 w-3.5" /> Add Payment
              </button>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [user, setUser] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [paymentProject, setPaymentProject] = useState<Project | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDeal, setFilterDeal] = useState<"all" | DealType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | Project["status"]>("all");
  const [filterContact, setFilterContact] = useState<"all" | ContactStatus>("all");

  // Check session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && VALID_USERS.some((u) => u.username === saved)) {
      setUser(saved);
    }
    setLoading(false);
  }, []);

  // Subscribe to Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(getProjectsCollection(), (snapshot) => {
      const data: Project[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || "",
          clientName: d.clientName || "",
          clientPhone: d.clientPhone || "",
          clientEmail: d.clientEmail || "",
          dealType: d.dealType || "buy",
          contactStatus: d.contactStatus || "not_contacted",
          interestLevel: d.interestLevel || "unknown",
          hasDomain: d.hasDomain || false,
          domainName: d.domainName || "",
          totalPrice: d.totalPrice || 0,
          paymentStatus: d.paymentStatus || "not_started",
          monthlyRent: d.monthlyRent || 0,
          rentDueDay: d.rentDueDay || 1,
          rentStartDate: d.rentStartDate || "",
          payments: d.payments || [],
          notes: d.notes || "",
          createdAt: d.createdAt || "",
          updatedAt: d.updatedAt || "",
          createdBy: d.createdBy || "",
          projectUrl: d.projectUrl || "",
          status: d.status || "active",
        };
      });
      setProjects(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });

    return () => unsubscribe();
  }, [user]);

  // CRUD operations
  const handleSave = async (data: ProjectFormData, id?: string) => {
    const now = new Date().toISOString();
    if (id) {
      await updateDoc(doc(getProjectsCollection(), id), { ...data, updatedAt: now });
    } else {
      await addDoc(getProjectsCollection(), { ...data, createdAt: now, updatedAt: now, createdBy: user });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    await deleteDoc(doc(getProjectsCollection(), id));
  };

  const handleAddPayment = async (projectId: string, payment: Omit<Payment, "id">) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const newPayment: Payment = { ...payment, id: crypto.randomUUID() };
    const updatedPayments = [...project.payments, newPayment];
    const paid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    let paymentStatus: PaymentStatus = "partial";
    if (paid === 0) paymentStatus = "not_started";
    else if (paid >= project.totalPrice) paymentStatus = "full";

    await updateDoc(doc(getProjectsCollection(), projectId), {
      payments: updatedPayments,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  // Filtering
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterDeal !== "all" && p.dealType !== filterDeal) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterContact !== "all" && p.contactStatus !== filterContact) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.clientEmail.toLowerCase().includes(q) ||
          p.clientPhone.includes(q) ||
          p.domainName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, filterDeal, filterStatus, filterContact, searchQuery]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-slate-500">Loading...</p></div>;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="ltr">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Project Tracker</h1>
              <p className="text-xs text-slate-500">Logged in as <strong>{user}</strong></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingProject(null); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-[0.97]">
              <Plus className="h-4 w-4" /> New Project
            </button>
            <button onClick={handleLogout} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats */}
        <StatsCards projects={projects} />

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, clients, domains..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filterDeal} onChange={(e) => setFilterDeal(e.target.value as typeof filterDeal)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500">
            <option value="all">All Deals</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
          </select>
          <select value={filterContact} onChange={(e) => setFilterContact(e.target.value as typeof filterContact)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500">
            <option value="all">All Contact</option>
            <option value="not_contacted">Not Contacted</option>
            <option value="contacted">Contacted</option>
            <option value="replied">Replied</option>
            <option value="no_reply">No Reply</option>
          </select>
        </div>

        {/* Project List */}
        <div className="mt-6 space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Globe className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">No projects found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {projects.length === 0 ? "Create your first project to get started." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                expanded={expandedId === project.id}
                onToggle={() => setExpandedId(expandedId === project.id ? null : project.id)}
                onEdit={() => { setEditingProject(project); setShowForm(true); }}
                onDelete={() => handleDelete(project.id)}
                onPayment={() => setPaymentProject(project)}
              />
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      {showForm && (
        <ProjectFormModal
          project={editingProject}
          currentUser={user}
          onClose={() => { setShowForm(false); setEditingProject(null); }}
          onSave={handleSave}
        />
      )}
      {paymentProject && (
        <PaymentModal
          project={paymentProject}
          onClose={() => setPaymentProject(null)}
          onAddPayment={handleAddPayment}
        />
      )}
    </div>
  );
}
