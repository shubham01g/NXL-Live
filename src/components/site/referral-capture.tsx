"use client";

import { useEffect } from "react";
import { PARTNERS } from "@/lib/data/fixtures/operations";
import { C } from "@/lib/data/demo";
import { readCollection, setValue, useDemoValue } from "@/lib/data/demo-store";
import { useClock } from "@/lib/hooks/use-clock";
import type { Partner } from "@/lib/domain/types";
import { toast } from "@/components/ui/toast";

/**
 * Partner attribution. A partner's link is any page with `?ref=CODE`; the
 * code is remembered for 30 days and attached to the next booking, which is
 * what credits the partner's commission. Read from `window.location` in an
 * effect rather than useSearchParams, so no page has to opt out of static
 * rendering to support it.
 */

export const REFERRAL_KEY = "referral";
export const REFERRAL_TTL = 30 * 86_400_000;

export interface StoredReferral {
  code: string;
  business: string;
  at: number;
}

export function ReferralCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (!code) return;
    const partner = readCollection<Partner>(C.partners, PARTNERS).find((p) => p.code === code && p.status === "active");
    if (!partner) return;
    setValue<StoredReferral>(REFERRAL_KEY, { code, business: partner.business, at: Date.now() });
    toast(`Welcome — referred by ${partner.business}. We'll look after you.`, "info");
  }, []);
  return null;
}

/** The referral still in its 30-day window, if any. */
export function useActiveReferral(): StoredReferral | null {
  const referral = useDemoValue<StoredReferral | null>(REFERRAL_KEY, null);
  const now = useClock(0);
  return referral && now - referral.at < REFERRAL_TTL ? referral : null;
}
