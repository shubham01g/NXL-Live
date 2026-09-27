"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CreditCard, Eye, EyeOff, KeyRound, MapPin, ShieldCheck, Smartphone } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import {
  completeMfa,
  completeReset,
  MIN_PASSWORD,
  requestReset,
  signIn,
  signUp,
  useSession,
} from "@/lib/auth/use-session";
import { useActiveReferral } from "@/components/site/referral-capture";
import type { MemberAccount } from "@/lib/domain/types";

/**
 * Sign in / create account / reset password / two-factor challenge.
 *
 * Every screen M3's auth needs is here and navigable. What is demo is said
 * plainly on the panel: credentials live in this browser, and any six-digit
 * code passes the OTP and 2FA steps. M3 puts real hashing, SendGrid email
 * codes and Twilio Verify behind exactly these steps.
 */

type Mode = "signup" | "signin";
type Stage =
  | { kind: "form" }
  | { kind: "mfa"; member: MemberAccount; sentTo: string }
  | { kind: "forgot" }
  | { kind: "reset-code"; email: string; sentTo: string };

const INCLUDED: {
  icon: ComponentType<{ width?: number; height?: number; className?: string }>;
  title: string;
  body: string;
}[] = [
  { icon: CreditCard, title: "Saved payment card", body: "Deposit held at pickup — not before" },
  { icon: ShieldCheck, title: "Insurance on file", body: "Use your own policy or our daily package" },
  { icon: MapPin, title: "Billing address", body: "For statements and delivery coordination" },
  { icon: KeyRound, title: "MFA & OTP security", body: "Two-factor sign-in and one-time reset codes" },
];

/** Only same-site paths are honoured as a post-sign-in destination. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export function AuthPanel({
  demoEmail,
  next,
  initialMode = "signin",
}: {
  demoEmail: string;
  next?: string;
  initialMode?: Mode;
}) {
  const router = useRouter();
  const session = useSession();
  const destination = safeNext(next);
  const activeReferral = useActiveReferral();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [email, setEmail] = useState(initialMode === "signin" ? demoEmail : "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [enrolled, setEnrolled] = useState(true);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Already signed in (and not mid-challenge)? Go where they were headed.
  useEffect(() => {
    if (session.status === "signed-in" && stage.kind === "form") router.replace(destination);
  }, [session.status, stage.kind, router, destination]);

  const reset = (to: Stage) => {
    setError(null);
    setCode("");
    setStage(to);
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp({ name, email, phone: phone || null, enrolled }, password, activeReferral?.code ?? null);

    setPending(false);
    if (result.ok === true) {
      toast(mode === "signin" ? `Welcome back, ${result.member.name.split(" ")[0]}.` : "Your account is ready.");
      router.push(destination);
      return;
    }
    if (result.ok === "mfa") {
      reset({ kind: "mfa", member: result.member, sentTo: result.sentTo });
      return;
    }
    setError(result.error);
  }

  /* ----------------------------- 2FA challenge ----------------------------- */
  if (stage.kind === "mfa") {
    return (
      <Shell>
        <BackButton onClick={() => reset({ kind: "form" })} />
        <Smartphone aria-hidden width={26} height={26} className="mt-5 text-gold" />
        <h2 className="mt-3 font-display text-2xl font-semibold text-cream">Two-factor sign-in</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We sent a 6-digit code to {stage.sentTo}. It expires in 10 minutes.
        </p>
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const res = completeMfa(stage.member, code);
            if (res.ok === true) {
              toast(`Welcome back, ${stage.member.name.split(" ")[0]}.`);
              router.push(destination);
            } else if (res.ok === false) setError(res.error);
          }}
        >
          <CodeField value={code} onChange={setCode} />
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" size="lg" className="w-full">
            Verify & sign in
            <ArrowRight aria-hidden width={16} height={16} />
          </Button>
        </form>
        <DemoHint>Demo: any six digits pass. Twilio Verify sends real codes at launch.</DemoHint>
      </Shell>
    );
  }

  /* ---------------------------- forgot password ---------------------------- */
  if (stage.kind === "forgot") {
    return (
      <Shell>
        <BackButton onClick={() => reset({ kind: "form" })} />
        <h2 className="mt-5 font-display text-2xl font-semibold text-cream">Reset your password</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Enter your account email. We&apos;ll send a one-time code to your phone or inbox.
        </p>
        <form
          className="mt-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await requestReset(email);
            if (res.ok) reset({ kind: "reset-code", email, sentTo: res.sentTo });
            else setError(res.error);
          }}
        >
          <Field label="Email" htmlFor="reset-email" required>
            <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" size="lg" className="w-full">
            Send code
            <ArrowRight aria-hidden width={16} height={16} />
          </Button>
        </form>
      </Shell>
    );
  }

  if (stage.kind === "reset-code") {
    return (
      <Shell>
        <BackButton onClick={() => reset({ kind: "forgot" })} />
        <h2 className="mt-5 font-display text-2xl font-semibold text-cream">Enter your code</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">Sent to {stage.sentTo}. Then choose a new password.</p>
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const res = completeReset(stage.email, code, newPassword);
            if (res.ok) {
              toast("Password updated — sign in with your new password.");
              setMode("signin");
              setPassword("");
              setNewPassword("");
              reset({ kind: "form" });
            } else setError(res.error);
          }}
        >
          <CodeField value={code} onChange={setCode} />
          <Field label="New password" htmlFor="reset-new" hint={`At least ${MIN_PASSWORD} characters.`} required>
            <Input id="reset-new" type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" size="lg" className="w-full">
            Set new password
          </Button>
        </form>
        <DemoHint>Demo: any six digits pass. SendGrid and Twilio deliver real codes at launch.</DemoHint>
      </Shell>
    );
  }

  /* ------------------------------ main form ------------------------------ */
  return (
    <Shell>
      <SegmentedControl<Mode>
        label="Account"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
          if (m === "signin" && !email) setEmail(demoEmail);
        }}
        options={[
          { value: "signup", label: "Create account" },
          { value: "signin", label: "Sign in" },
        ]}
      />

      {activeReferral && mode === "signup" ? (
        <p className="mt-4 rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold">
          Referred by {activeReferral.business} · code {activeReferral.code}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        {mode === "signup" ? (
          <Field label="Full name" htmlFor="auth-name" required>
            <Input id="auth-name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
          </Field>
        ) : null}

        <Field label="Email" htmlFor="auth-email" required>
          <Input id="auth-email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </Field>

        <Field
          label="Password"
          htmlFor="auth-password"
          required
          hint={mode === "signup" ? `At least ${MIN_PASSWORD} characters.` : undefined}
        >
          <div className="relative">
            <Input
              id="auth-password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-gold"
            >
              {show ? <EyeOff width={16} height={16} /> : <Eye width={16} height={16} />}
            </button>
          </div>
        </Field>

        {mode === "signin" ? (
          <div className="-mt-2 text-right">
            <button type="button" onClick={() => reset({ kind: "forgot" })} className="text-xs text-gold hover:underline">
              Forgot password?
            </button>
          </div>
        ) : (
          <>
            <Field label="Mobile" htmlFor="auth-phone" hint="For delivery coordination and one-time codes. Optional.">
              <Input id="auth-phone" name="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(305) 555-0142" />
            </Field>
            <div className="flex items-start justify-between gap-4 rounded-md border border-line bg-ink/40 p-4">
              <div className="min-w-0">
                <p className="text-sm text-cream">Join Level Rewards</p>
                <p className="mt-0.5 text-xs text-muted-dim">Free, and it earns from your first rental.</p>
              </div>
              <Toggle label="Join Level Rewards" checked={enrolled} onChange={setEnrolled} />
            </div>
          </>
        )}

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          <ArrowRight aria-hidden width={16} height={16} />
        </Button>
      </form>

      <DemoHint>
        {mode === "signin" ? (
          <>
            Demo: sign in as{" "}
            <button
              type="button"
              onClick={() => {
                setEmail(demoEmail);
                setPassword("demo-password");
                setError(null);
              }}
              className="text-gold underline-offset-2 hover:underline"
            >
              {demoEmail}
            </button>{" "}
            with any password.
          </>
        ) : (
          "Demo accounts are saved in this browser. Real credentials arrive with the backend."
        )}
      </DemoHint>

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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="edge-gold rounded-xl p-6 shadow-elev-2 sm:p-8">{children}</div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
      <ArrowLeft aria-hidden width={14} height={14} />
      Back
    </button>
  );
}

function DemoHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-center text-xs text-muted-dim">{children}</p>;
}

/** Six-digit one-time code input — numeric keypad, paste-friendly. */
export function CodeField({ value, onChange, id = "otp-code" }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <Field label="6-digit code" htmlFor={id} required>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••••"
        className="text-center font-mono text-2xl tracking-[0.6em]"
      />
    </Field>
  );
}
