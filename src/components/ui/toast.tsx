"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Toasts. A tiny module-level queue so any handler can confirm an action
 * with `toast("Saved")` without threading callbacks through props. The
 * Toaster is mounted once, in the root layout.
 */

type Tone = "success" | "info" | "warning";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, tone: Tone = "success") {
  const id = ++seq;
  toasts = [...toasts, { id, message, tone }].slice(-4);
  emit();
  window.setTimeout(() => dismiss(id), 4200);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const EMPTY: Toast[] = [];

const ICON = { success: CheckCircle2, info: Info, warning: TriangleAlert } as const;
const TONE = { success: "text-success", info: "text-info", warning: "text-warning" } as const;

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[var(--z-toast)] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-6 sm:top-20 sm:items-end"
    >
      {items.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-lg border border-line-strong bg-surface-2/95 px-4 py-3 text-sm text-cream shadow-elev-3 backdrop-blur"
          >
            <Icon aria-hidden width={17} height={17} className={cn("mt-0.5 shrink-0", TONE[t.tone])} />
            <p className="min-w-0 flex-1 leading-relaxed">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-muted hover:text-cream"
            >
              <X width={14} height={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
