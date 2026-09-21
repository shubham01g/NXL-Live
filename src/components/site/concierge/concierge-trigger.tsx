"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { openConcierge } from "./concierge-widget";

/** Opens JERALD from anywhere on the page. */
export function ConciergeTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openConcierge}
      className={cn(
        "group flex w-full items-start gap-4 rounded-lg border border-gold/25 bg-gold/5 p-5 text-left",
        "transition-colors hover:border-gold/50 hover:bg-gold/10",
        className,
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink">
        <MessageCircle aria-hidden width={18} height={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-semibold text-cream">
          Chat with JERALD now
        </span>
        <span className="mt-1 block text-sm text-muted">
          Our concierge answers instantly on fleet, pricing, insurance and delivery.
        </span>
      </span>
    </button>
  );
}
