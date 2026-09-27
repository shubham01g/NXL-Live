"use client";

import { useState } from "react";
import { Copy, KeyRound, ShieldCheck } from "lucide-react";
import { shortDate } from "@/lib/domain/format";
import { changePassword, MIN_PASSWORD, updateMember, useMember } from "@/lib/auth/use-session";
import { logAudit } from "@/lib/data/demo";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { CodeField } from "../auth-panel";
import { DetailRow, Panel } from "../panel";

/**
 * Password, two-factor and recovery codes. Every screen is real; what is demo
 * is the delivery — codes are not actually texted until Twilio Verify is
 * wired at M5, so any six digits confirm enrolment here.
 */

function makeCodes() {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 2 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join("-"),
  );
}

export function SecurityPanel() {
  const member = useMember();
  const [enrolling, setEnrolling] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  if (!member) return null;
  const sec = member.security;

  return (
    <>
      <Panel tone={sec.mfaEnabled ? "gold" : "default"} title="Two-factor authentication">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-cream">{sec.mfaEnabled ? "On — a code is required at sign-in" : "Off"}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {sec.otpPhoneLast4
                ? `One-time codes go to the number ending ${sec.otpPhoneLast4}.`
                : "Add a mobile number in Contact information to receive codes."}
            </p>
          </div>
          <Toggle
            label="Two-factor authentication"
            checked={sec.mfaEnabled}
            disabled={!sec.otpPhoneLast4}
            onChange={(on) => {
              if (on) {
                setCode("");
                setCodeError(null);
                setEnrolling(true);
              } else {
                updateMember((m) => ({ ...m, security: { ...m.security, mfaEnabled: false } }));
                logAudit(member.name, "auth.mfa_disabled", member.email, "Two-factor turned off");
                toast("Two-factor authentication is off.", "warning");
              }
            }}
          />
        </div>
        <dl className="mt-5">
          <DetailRow label="Recovery codes">
            {sec.recoveryCodesRemaining > 0 ? `${sec.recoveryCodesRemaining} remaining` : "None generated"}
          </DetailRow>
        </dl>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={!sec.mfaEnabled}
          onClick={() => {
            const fresh = makeCodes();
            setCodes(fresh);
            updateMember((m) => ({ ...m, security: { ...m.security, recoveryCodesRemaining: fresh.length } }));
          }}
        >
          <ShieldCheck aria-hidden width={14} height={14} />
          {sec.recoveryCodesRemaining ? "Regenerate recovery codes" : "Generate recovery codes"}
        </Button>
      </Panel>

      <Panel title="Password" description={sec.passwordUpdatedAt ? `Last changed ${shortDate(sec.passwordUpdatedAt)}.` : "No password changes yet."}>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (next !== confirm) return setPwError("The new passwords don't match.");
            const res = changePassword(member, current, next);
            if (!res.ok) return setPwError(res.error);
            setPwError(null);
            setCurrent("");
            setNext("");
            setConfirm("");
            logAudit(member.name, "auth.password_changed", member.email, "Password changed");
            toast("Password updated.");
          }}
        >
          <Field label="Current" htmlFor="pw-current">
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New" htmlFor="pw-new" hint={`${MIN_PASSWORD}+ characters`}>
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new" htmlFor="pw-confirm">
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {pwError ? <Alert tone="danger" className="sm:col-span-3">{pwError}</Alert> : null}
          <div className="sm:col-span-3">
            <Button type="submit" size="sm" disabled={!next}>
              <KeyRound aria-hidden width={14} height={14} /> Update password
            </Button>
          </div>
        </form>
        <p className="mt-4 text-xs text-muted-dim">Forgot it? Sign out and use “Forgot password” — a one-time code resets it.</p>
      </Panel>

      <Modal
        open={enrolling}
        onClose={() => setEnrolling(false)}
        size="sm"
        title="Turn on two-factor"
        description={`We sent a 6-digit code to the number ending ${sec.otpPhoneLast4}. Enter it to finish.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEnrolling(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!/^\d{6}$/.test(code)) return setCodeError("Enter the 6-digit code.");
                updateMember((m) => ({ ...m, security: { ...m.security, mfaEnabled: true } }));
                logAudit(member.name, "auth.mfa_enabled", member.email, "Two-factor turned on");
                setEnrolling(false);
                const fresh = makeCodes();
                setCodes(fresh);
                updateMember((m) => ({ ...m, security: { ...m.security, recoveryCodesRemaining: fresh.length } }));
                toast("Two-factor authentication is on.");
              }}
            >
              Verify
            </Button>
          </>
        }
      >
        <CodeField id="mfa-code" value={code} onChange={setCode} />
        {codeError ? <p className="mt-2 text-xs text-danger">{codeError}</p> : null}
        <p className="mt-3 text-xs text-muted-dim">Demo: any six digits verify. Real codes arrive via Twilio at launch.</p>
      </Modal>

      <Modal
        open={!!codes}
        onClose={() => setCodes(null)}
        size="sm"
        title="Save your recovery codes"
        description="Each code signs you in once if you lose your phone. They won't be shown again."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(codes?.join("\n") ?? "");
                toast("Codes copied.");
              }}
            >
              <Copy aria-hidden width={14} height={14} /> Copy
            </Button>
            <Button onClick={() => setCodes(null)}>I&apos;ve saved them</Button>
          </>
        }
      >
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm tabular-nums text-cream">
          {codes?.map((c) => (
            <li key={c} className="rounded-md border border-line bg-ink/50 px-3 py-2 text-center">{c}</li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
