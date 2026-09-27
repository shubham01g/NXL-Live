"use client";

import { useSyncExternalStore } from "react";
import { repo } from "@/lib/data";
import { findMember, registerCustomer, rememberMember } from "@/lib/data/demo";
import { readValue, setValue } from "@/lib/data/demo-store";
import type { MemberAccount, NewMemberInput } from "@/lib/domain/types";
import {
  endSession,
  getServerSnapshot,
  getSnapshot,
  startSession,
  subscribe,
  updateMember as updateSessionMember,
  type SessionState,
} from "./session-store";

/** The current session. `loading` until the store hydrates after first paint. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The signed-in member, or null.
 *
 * Section panels render inside the guarded shell, so null here means the
 * shell is still showing its skeleton — the panel returns nothing rather
 * than duplicating the guard.
 */
export function useMember(): MemberAccount | null {
  const session = useSession();
  return session.status === "signed-in" ? session.member : null;
}

/* -------------------------------- results -------------------------------- */

export type AuthResult =
  | { ok: true; member: MemberAccount }
  | { ok: false; error: string }
  /** Password accepted; a one-time code is required before the session starts. */
  | { ok: "mfa"; member: MemberAccount; sentTo: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Demo credentials.
 *
 * M2 has no server, so passwords live in this browser's demo store, keyed by
 * email. The seeded demo account accepts any password — it is there to be
 * explored. Accounts created here must use the password they were created
 * with. M3 replaces all of this with hashed credentials on the server.
 */
const CREDENTIALS = "credentials";
type Credentials = Record<string, string>;

function passwordFor(email: string): string | null {
  return readValue<Credentials>(CREDENTIALS, {})[email] ?? null;
}

function setPassword(email: string, password: string) {
  setValue<Credentials>(CREDENTIALS, { ...readValue<Credentials>(CREDENTIALS, {}), [email]: password });
}

export const MIN_PASSWORD = 8;

async function lookup(email: string): Promise<MemberAccount | null> {
  return findMember(email) ?? (await repo.getMemberByEmail(email));
}

/** Where a one-time code is "sent" — masked, for the challenge screen. */
function codeDestination(member: MemberAccount): string {
  if (member.security.otpPhoneLast4) return `your phone ending ${member.security.otpPhoneLast4}`;
  const [user, domain] = member.email.split("@");
  return `${user.slice(0, 2)}•••@${domain}`;
}

export async function signIn(rawEmail: string, password: string): Promise<AuthResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!password) return { ok: false, error: "Enter your password." };

  const member = await lookup(email);
  if (!member) {
    return { ok: false, error: "No account found for that email. Create one, or try alex@example.com." };
  }

  const stored = passwordFor(email);
  if (stored !== null && stored !== password) {
    return { ok: false, error: "That password doesn't match. Try again or reset it." };
  }

  if (member.security.mfaEnabled) {
    return { ok: "mfa", member, sentTo: codeDestination(member) };
  }

  startSession(member);
  rememberMember(member);
  return { ok: true, member };
}

/** Finish a two-factor sign-in. Any six digits pass in the demo. */
export function completeMfa(member: MemberAccount, code: string): AuthResult {
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Enter the 6-digit code." };
  startSession(member);
  rememberMember(member);
  return { ok: true, member };
}

/** Create an account and sign straight into it. */
export async function signUp(input: NewMemberInput, password: string, referredBy: string | null = null): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (name.length < 2) return { ok: false, error: "Enter your full name." };
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Choose a password of at least ${MIN_PASSWORD} characters.` };
  }
  if (findMember(email)) return { ok: false, error: "An account already exists for that email. Sign in instead." };

  try {
    const created = await repo.createMember({ ...input, name, email, phone });
    const member: MemberAccount = {
      ...created,
      security: {
        ...created.security,
        otpPhoneLast4: phone ? phone.replace(/\D/g, "").slice(-4) || null : null,
        passwordUpdatedAt: Date.now(),
      },
    };
    setPassword(email, password);
    startSession(member);
    rememberMember(member);
    registerCustomer(member, referredBy ? "referral" : "web", referredBy);
    return { ok: true, member };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create that account. Try again.",
    };
  }
}

/** Step one of a reset: confirm the account exists and "send" a code. */
export async function requestReset(rawEmail: string): Promise<{ ok: true; sentTo: string } | { ok: false; error: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address." };
  const member = await lookup(email);
  if (!member) return { ok: false, error: "No account found for that email." };
  return { ok: true, sentTo: codeDestination(member) };
}

/** Step two: check the code and set the new password. */
export function completeReset(rawEmail: string, code: string, password: string): { ok: true } | { ok: false; error: string } {
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Enter the 6-digit code we sent." };
  if (password.length < MIN_PASSWORD) return { ok: false, error: `Use at least ${MIN_PASSWORD} characters.` };
  setPassword(rawEmail.trim().toLowerCase(), password);
  return { ok: true };
}

/** Change password from Security, while signed in. */
export function changePassword(member: MemberAccount, current: string, next: string): { ok: true } | { ok: false; error: string } {
  const stored = passwordFor(member.email);
  if (stored !== null && stored !== current) return { ok: false, error: "Your current password is incorrect." };
  if (next.length < MIN_PASSWORD) return { ok: false, error: `Use at least ${MIN_PASSWORD} characters.` };
  setPassword(member.email, next);
  updateMember((m) => ({ ...m, security: { ...m.security, passwordUpdatedAt: Date.now() } }));
  return { ok: true };
}

/**
 * Apply a change to the signed-in member. Also written to the demo registry,
 * so signing out and back in keeps the change.
 */
export function updateMember(change: (current: MemberAccount) => MemberAccount): MemberAccount | null {
  const next = updateSessionMember(change);
  if (next) rememberMember(next);
  return next;
}

export { endSession as signOut };
export type { SessionState };
