import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------- alert --------------------------------- */

type AlertTone = "info" | "success" | "warning" | "danger";

const ALERT_META: Record<
  AlertTone,
  { wrap: string; icon: ComponentType<{ width?: number; height?: number; className?: string }> }
> = {
  info: { wrap: "border-info/25 bg-info-dim/50 text-info", icon: Info },
  success: {
    wrap: "border-success/25 bg-success-dim/50 text-success",
    icon: CheckCircle2,
  },
  warning: {
    wrap: "border-warning/25 bg-warning-dim/50 text-warning",
    icon: AlertTriangle,
  },
  danger: { wrap: "border-danger/25 bg-danger-dim/50 text-danger", icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const meta = ALERT_META[tone];
  const Icon = meta.icon;

  return (
    <div className={cn("flex gap-3 rounded-md border p-4", meta.wrap, className)}>
      <Icon aria-hidden width={18} height={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <div className={cn("text-sm leading-relaxed text-cream/75", title && "mt-1")}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- empty state ------------------------------ */

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-16 text-center",
        className,
      )}
    >
      <p className="font-display text-xl text-cream">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ progress bar ------------------------------ */

export function ProgressBar({
  value,
  label,
  tone = "gold",
  className,
}: {
  /** 0–1 */
  value: number;
  label: string;
  tone?: "gold" | "success" | "warning" | "danger";
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const fills = {
    gold: "bg-gradient-to-r from-gold-600 to-gold-200",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  } as const;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-editorial", fills[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
