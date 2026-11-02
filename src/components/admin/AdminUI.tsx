"use client";

import { ReactNode, useEffect } from "react";
import { X, LoaderCircle, Inbox } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, type OrderStatus } from "@/lib/admin";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="clinical-page-heading">{title}</h1>
        <p className="clinical-muted mt-2 max-w-3xl text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`clinical-panel p-5 ${className}`}>
      {children}
    </div>
  );
}

export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  size = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className={`w-full ${size} rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg`}>
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <h2 id="admin-modal-title" className="text-xl font-bold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-8 text-center">
      <Inbox className="h-11 w-11 text-[var(--muted)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="clinical-muted mt-2 max-w-md text-sm">{description}</p>
    </div>
  );
}

export function LoadingState({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div className="clinical-panel flex min-h-56 items-center justify-center">
      <div className="flex items-center gap-3 text-[var(--muted)]" role="status">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${ORDER_STATUS_STYLES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{children}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`clinical-input text-sm ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`clinical-input min-h-28 text-sm ${props.className ?? ""}`}
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`clinical-input text-sm ${props.className ?? ""}`}
    />
  );
}
