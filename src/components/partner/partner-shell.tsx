"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BadgeDollarSign, Handshake, LayoutDashboard, Link2, LogOut, Menu, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Badge, Eyebrow } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import type { Partner } from "@/lib/domain/types";
import { PARTNERS } from "@/lib/data/fixtures/operations";
import { C, logAudit } from "@/lib/data/demo";
import { readCollection, setValue, useCollection, useDemoReady, useDemoValue } from "@/lib/data/demo-store";

/**
 * The partner portal — the prototype's PartnerDashboard, lifted into its own
 * app with a sidebar. A partner signs in with their referral code; at M3 that
 * becomes a real partner login. Sessions live in the demo store until then.
 */

const SESSION = "partner-session";

const NAV = [
  { href: "/partner", label: "Overview", icon: LayoutDashboard },
  { href: "/partner/referrals", label: "Referrals", icon: Users },
  { href: "/partner/links", label: "Links & QR", icon: Link2 },
  { href: "/partner/payouts", label: "Payouts", icon: BadgeDollarSign },
  { href: "/partner/profile", label: "Profile", icon: UserRound },
];

export function usePartner(): Partner | null {
  const partners = useCollection<Partner>(C.partners, PARTNERS);
  const id = useDemoValue<string | null>(SESSION, null);
  return partners.find((p) => p.id === id) ?? null;
}

export function signOutPartner() {
  setValue<string | null>(SESSION, null);
}

function signInPartner(code: string): { ok: true; partner: Partner } | { ok: false; error: string } {
  const c = code.trim().toUpperCase();
  const partner = readCollection<Partner>(C.partners, PARTNERS).find((p) => p.code === c);
  if (!partner) return { ok: false, error: "That code wasn't found. Check your welcome email, or apply to become a partner." };
  if (partner.status === "pending") return { ok: false, error: "Your application is still being reviewed — we'll email you when your code is live." };
  setValue(SESSION, partner.id);
  logAudit(partner.contact, "auth.partner_signed_in", partner.business, `Code ${partner.code}`);
  return { ok: true, partner };
}

export function PartnerShell({ children }: { children: ReactNode }) {
  const ready = useDemoReady();
  const partner = usePartner();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenu(false);
  }

  // /partner?code=FAENA12 — the back office's "Open their portal" link.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) signInPartner(code);
  }, []);

  if (!ready) {
    return (
      <div aria-hidden className="grid min-h-dvh lg:grid-cols-[16rem_1fr]">
        <div className="hidden border-r border-line bg-surface-1/60 lg:block" />
        <div className="space-y-4 p-6 lg:p-10">
          <div className="skeleton h-10 w-64 rounded-md" />
          <div className="skeleton h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!partner) return <PartnerSignIn />;

  const nav = (
    <>
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Link href="/" aria-label="NXL — public site"><Logo decorative className="h-10" /></Link>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-tight text-cream">Partner Portal</p>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Referral programme</p>
        </div>
      </div>
      <div className="mx-4 rounded-lg edge-gold px-3 py-3">
        <p className="truncate text-sm font-medium text-cream">{partner.business}</p>
        <p className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{partner.type}</span>
          <span className="font-mono text-gold">{partner.code}</span>
        </p>
      </div>
      <nav aria-label="Partner" className="flex flex-1 flex-col gap-0.5 px-3 pb-24 pt-6">
        {NAV.map((n) => {
          const Icon = n.icon;
          const current = n.href === "/partner" ? pathname === "/partner" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                current ? "edge-gold font-medium text-cream" : "border border-transparent text-cream/75 hover:bg-surface-2 hover:text-cream",
              )}
            >
              <Icon aria-hidden width={17} height={17} className={current ? "text-gold" : "text-muted"} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-line bg-surface-1/60 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto">{nav}</div>
      </aside>
      {menu ? (
        <div className="fixed inset-0 z-[var(--z-overlay)] lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,18rem)] animate-rise flex-col overflow-y-auto border-r border-line bg-surface-1">{nav}</div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-[var(--z-header)] flex h-16 items-center gap-3 border-b border-line bg-ink/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full border border-line text-cream lg:hidden">
            <Menu width={18} height={18} />
          </button>
          <p className="min-w-0 truncate text-sm text-muted">
            Partner portal <span className="mx-2 text-muted-dim">/</span>
            <span className="font-medium text-cream">{NAV.find((n) => (n.href === "/partner" ? pathname === "/partner" : pathname.startsWith(n.href)))?.label}</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Badge tone={partner.status === "active" ? "success" : "warning"} className="hidden sm:inline-flex">
              {partner.status === "active" ? "Active" : "Paused"} · {partner.commission}%
            </Badge>
            <Link href="/" className="hidden items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs text-cream/80 hover:text-gold sm:inline-flex">
              View site <ArrowUpRight aria-hidden width={14} height={14} />
            </Link>
            <button type="button" onClick={() => { signOutPartner(); toast("Signed out of the partner portal."); }} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:text-gold">
              <LogOut width={16} height={16} />
            </button>
          </div>
        </header>
        <main id="main" className="min-w-0 flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-10 lg:pt-10">
          {partner.status === "paused" ? (
            <Alert tone="warning" className="mb-6" title="Your account is paused">New referrals aren&apos;t being credited right now. Contact partnerships to reactivate.</Alert>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

function PartnerSignIn() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const demo = PARTNERS.filter((p) => p.status === "active").slice(0, 3);
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-md">
        <Logo className="mx-auto h-16" />
        <div className="mt-8 text-center">
          <Eyebrow className="justify-center">Partner portal</Eyebrow>
          <h1 className="mt-4 font-display text-3xl font-semibold text-cream">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in with the referral code from your welcome email to see referrals, earnings and payouts.</p>
        </div>
        <form
          className="edge-gold mt-8 space-y-5 rounded-xl p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const res = signInPartner(code);
            if (res.ok) toast(`Welcome, ${res.partner.contact.split(" ")[0]}.`);
            else setError(res.error);
          }}
        >
          <Field label="Referral code" htmlFor="pt-code" required>
            <Input id="pt-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono text-lg uppercase tracking-widest" placeholder="FAENA12" autoFocus />
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" size="lg" className="w-full">
            <Handshake aria-hidden width={16} height={16} /> Enter portal
          </Button>
          <p className="text-center text-xs text-muted-dim">
            Demo codes:{" "}
            {demo.map((p, i) => (
              <span key={p.id}>
                <button type="button" onClick={() => setCode(p.code)} className="font-mono text-gold hover:underline">{p.code}</button>
                {i < demo.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Not a partner yet? <Link href="/partners" className="text-gold hover:underline">Apply to the programme</Link>
        </p>
      </div>
    </div>
  );
}
