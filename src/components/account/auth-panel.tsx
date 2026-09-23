"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard, KeyRound, MapPin, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { signIn, signUp, useSession } from "@/lib/auth/use-session";

/**
 * Sign in / create account.
 *
 * There is no password field. At M2 there is no server to check one against,
 * and a field that accepts any input would imply a check that is not
 * happening — worse than being straight about it. The panel says what it is,
 * and M3 adds credentials, OTP and 2FA behind the same two tabs.
 */

type Mode = "signup" | "signin";

const INCLUDED: {
  icon: ComponentType<{ width?: number; height?: number; className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    icon: CreditCard,
    title: "Saved payment card",
    body: "Deposit charged at pickup — not before",
  },
  {
    icon: ShieldCheck,
    title: "Insurance on file",
    body: "Use your own policy or our daily package",
  },
  {
    icon: MapPin,
    title: "Billing address",
    body: "For statements and delivery coordination",
  },
  {
    icon: KeyRound,
    title: "MFA & OTP security",
    body: "Two-factor and one-time reset codes",
  },
];

export function AuthPanel({ demoEmail }: { demoEmail: string }) {
  const router = useRouter();
  const session = useSession();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState(demoEmail);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [enrolled, setEnrolled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Already signed in? The account is what they wanted.
  useEffect(() => {
    if (session.status === "signed-in") router.replace("/account");
  }, [session.status, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result =
      mode === "signin"
        ? await signIn(email)
        : await signUp({ name, email, phone: phone || null, enrolled });

    if (result.ok) {
      // Both paths land on the dashboard.
      router.push("/account");
      return;
    }

    setError(result.error);
    setPending(false);
  }

  return (
    <div className="edge-gold rounded-xl p-6 shadow-elev-2 sm:p-8">
      <SegmentedControl<Mode>
        label="Account"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError(null);
        }}
        options={[
          { value: "signup", label: "Create account" },
          { value: "signin", label: "Sign in" },
        ]}
      />

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        {mode === "signup" ? (
          <Field label="Full name" htmlFor="auth-name" required>
            <Input
              id="auth-name"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
            />
          </Field>
        ) : null}

        <Field label="Email" htmlFor="auth-email" required>
          <Input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </Field>

        {mode === "signup" ? (
          <>
            <Field
              label="Mobile"
              htmlFor="auth-phone"
              hint="For delivery coordination and one-time codes. Optional."
            >
              <Input
                id="auth-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(305) 555-0142"
              />
            </Field>

            <div className="flex items-start justify-between gap-4 rounded-md border border-line bg-ink/40 p-4">
              <div className="min-w-0">
                <p className="text-sm text-cream">Join Level Rewards</p>
                <p className="mt-0.5 text-xs text-muted-dim">
                  Free, and it earns from your first rental.
                </p>
              </div>
              <Toggle
                label="Join Level Rewards"
                checked={enrolled}
                onChange={setEnrolled}
              />
            </div>
          </>
        ) : null}

        {error ? (
          <Alert tone="danger">{error}</Alert>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? "One moment…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
          <ArrowRight aria-hidden width={16} height={16} />
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-muted-dim">
        {mode === "signin" ? (
          <>
            Demo: try{" "}
            <button
              type="button"
              onClick={() => {
                setEmail(demoEmail);
                setError(null);
              }}
              className="text-gold underline-offset-2 hover:underline"
            >
              {demoEmail}
            </button>{" "}
            to explore an existing account.
          </>
        ) : (
          "No password yet — sign-in credentials, OTP and 2FA arrive with the backend."
        )}
      </p>

      <hr className="rule-gold my-7" />

      <h2 className="font-mono text-2xs uppercase text-muted">Your account includes</h2>
      <ul className="mt-4 divide-y divide-line">
        {INCLUDED.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex items-start gap-3 py-3">
              <Icon aria-hidden width={16} height={16} className="mt-0.5 shrink-0 text-gold" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-cream">{item.title}</p>
                <p className="text-xs text-muted-dim">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
