"use client";

import type { MemberAccount, Money } from "@/lib/domain/types";
import { DEMO_MEMBER } from "./fixtures/member";
import { C, logAudit, notify } from "./demo";
import { create, newId, patch, readCollection, readValue, useCollection, useDemoValue } from "./demo-store";

/**
 * The member referral programme.
 *
 * A member's code is derived from their name and id, never stored, so it can
 * not drift. Every friend who joins with it is one row here, and the member's
 * credit is the sum of the rows not yet moved to their Drive Wallet — the
 * Referrals tab, the sign-up form and the back office all read these rows.
 * The reward amount is the one the back office sets under Marketing.
 */

export interface ReferralProgram {
  referrerCredit: number;
  refereeDiscount: number;
  minBooking: number;
  enabled: boolean;
}

export const REFERRAL_PROGRAM_KEY = "referral-program";
export const DEFAULT_PROGRAM: ReferralProgram = { referrerCredit: 50, refereeDiscount: 10, minBooking: 500, enabled: true };

export const useReferralProgram = () => useDemoValue<ReferralProgram>(REFERRAL_PROGRAM_KEY, DEFAULT_PROGRAM);

/** One friend who joined on a member's code. */
export interface MemberReferral {
  id: string;
  code: string;
  referrerEmail: string;
  friendName: string;
  friendEmail: string;
  at: number;
  credit: Money;
  /** True once the credit has been moved to the referrer's Drive Wallet. */
  redeemed: boolean;
}

export const MEMBER_REFERRALS = "member-referrals";

/** "ALEX-4721" — first name plus four digits hashed from the member id. */
export function referralCodeFor(member: Pick<MemberAccount, "id" | "name">): string {
  const prefix = member.name.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "NXL";
  let hash = 0;
  for (const ch of member.id) hash = (hash * 31 + ch.charCodeAt(0)) % 10_000;
  return `${prefix}-${String(hash).padStart(4, "0")}`;
}

export function normaliseCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** The member a code belongs to, among the accounts this demo knows about. */
export function findReferrer(rawCode: string): MemberAccount | null {
  const code = normaliseCode(rawCode);
  if (!code) return null;
  const registered = readCollection<MemberAccount>(C.members, []);
  const known = registered.some((m) => m.id === DEMO_MEMBER.id) ? registered : [...registered, DEMO_MEMBER];
  return known.find((m) => referralCodeFor(m) === code) ?? null;
}

export function useReferralsOf(member: MemberAccount): MemberReferral[] {
  const code = referralCodeFor(member);
  return useCollection<MemberReferral>(MEMBER_REFERRALS, [])
    .filter((r) => r.code === code)
    .sort((a, b) => b.at - a.at);
}

/** Credit the referrer for a friend who has just created an account. */
export function recordReferral(referrer: MemberAccount, friend: MemberAccount): MemberReferral | null {
  const program = readValue<ReferralProgram>(REFERRAL_PROGRAM_KEY, DEFAULT_PROGRAM);
  if (!program.enabled || referrer.email === friend.email) return null;
  const code = referralCodeFor(referrer);
  const already = readCollection<MemberReferral>(MEMBER_REFERRALS, []).some((r) => r.friendEmail === friend.email);
  if (already) return null;

  const row: MemberReferral = {
    id: newId("mref"),
    code,
    referrerEmail: referrer.email,
    friendName: friend.name,
    friendEmail: friend.email,
    at: Date.now(),
    credit: program.referrerCredit,
    redeemed: false,
  };
  create<MemberReferral>(MEMBER_REFERRALS, row);
  notify({
    email: referrer.email,
    kind: "update",
    at: Date.now(),
    href: "/account/referrals",
    title: `${friend.name.split(" ")[0]} joined on your link`,
    body: `$${program.referrerCredit} in referral credit is waiting in your account.`,
  });
  logAudit(referrer.name, "member.referral", friend.name, `Referral credit +$${program.referrerCredit} — joined with code ${code}`);
  return row;
}

/** Mark a member's unredeemed rows as moved to the wallet; returns the total. */
export function redeemReferrals(rows: MemberReferral[]): Money {
  const open = rows.filter((r) => !r.redeemed);
  for (const row of open) patch<MemberReferral>(MEMBER_REFERRALS, row, { redeemed: true });
  return open.reduce((sum, r) => sum + r.credit, 0);
}
