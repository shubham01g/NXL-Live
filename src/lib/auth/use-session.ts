"use client";

import { useSyncExternalStore } from "react";
import { repo } from "@/lib/data";
import type { MemberAccount, NewMemberInput } from "@/lib/domain/types";
import {
  endSession,
  getServerSnapshot,
  getSnapshot,
  startSession,
  subscribe,
  updateMember,
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
  | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Sign in by email.
 *
 * No password at M2 — credentials, OTP and 2FA are M3, and a password field
 * that accepts anything would be worse than no field at all. The form says so
 * plainly rather than implying a check that is not happening.
 */
export async function signIn(rawEmail: string): Promise<AuthResult> {
  const email = rawEmail.trim().toLowerCase();

  if (!EMAIL.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const member = await repo.getMemberByEmail(email);
  if (!member) {
    return {
      ok: false,
      error: "No account found for that email. Create one, or try alex@example.com.",
    };
  }

  startSession(member);
  return { ok: true, member };
}

/** Create an account and sign straight into it. */
export async function signUp(input: NewMemberInput): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (name.length < 2) {
    return { ok: false, error: "Enter your full name." };
  }
  if (!EMAIL.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    const member = await repo.createMember({ ...input, name, email, phone });
    startSession(member);
    return { ok: true, member };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create that account. Try again.",
    };
  }
}

export { endSession as signOut, updateMember };
export type { SessionState };
