"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Share2 } from "lucide-react";
import { money, shortDate } from "@/lib/domain/format";
import { SITE } from "@/lib/domain/site";
import type { WalletEntry } from "@/lib/domain/types";
import { updateMember, useMember } from "@/lib/auth/use-session";
import { newId } from "@/lib/data/demo-store";
import { redeemReferrals, referralCodeFor, useReferralProgram, useReferralsOf } from "@/lib/data/referrals";
import { timestamp } from "@/lib/hooks/use-clock";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { Avatar } from "../avatar";
import { Panel, SectionHeader } from "../panel";

/**
 * The member referral programme.
 *
 * The reward is whatever the back office has set under Marketing, and the
 * figures are counted from the referral rows themselves — so "friends joined",
 * "total earned" and the list underneath can never disagree. Redeeming moves
 * the credit into the Drive Wallet, which checkout already spends.
 */
export function ReferralsSection() {
  const member = useMember();
  if (!member) return null;
  return <Referrals />;
}

function Referrals() {
  const member = useMember()!;
  const program = useReferralProgram();
  const referrals = useReferralsOf(member);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const code = referralCodeFor(member);
  const link = `${SITE.url}/membership?ref=${code}`;
  const reward = money(program.referrerCredit);
  const available = referrals.filter((r) => !r.redeemed).reduce((sum, r) => sum + r.credit, 0);
  const earned = referrals.reduce((sum, r) => sum + r.credit, 0);

  function copy() {
    void navigator.clipboard?.writeText(link);
    setCopied(true);
    toast("Link copied.");
    window.setTimeout(() => setCopied(false), 1800);
  }

  function share() {
    if (typeof navigator.share === "function") {
      void navigator
        .share({ title: `Join ${SITE.name}`, text: "I drive exotics through NXL. Use my link to join and we both win.", url: link })
        .catch(() => undefined);
    } else {
      copy();
    }
  }

  function redeem() {
    const amount = redeemReferrals(referrals);
    setConfirming(false);
    if (amount <= 0) return;
    updateMember((m) => {
      const credits = m.credits + amount;
      const entry: WalletEntry = { id: newId("w"), kind: "bonus", label: "Referral credit", amount, balanceAfter: credits, createdAt: timestamp() };
      return { ...m, credits, creditsLoaded: m.creditsLoaded + amount, wallet: [...m.wallet, entry] };
    });
    toast(`${money(amount)} moved to your Drive Wallet.`);
  }

  const steps = [
    { title: "Share your link", body: "Send your referral link to friends, family, or anyone interested in exotic rentals." },
    { title: "They join NXL", body: "Your friend creates a free account from your link, or enters your code at sign-up." },
    { title: `You earn ${reward}`, body: `${reward} in referral credit is added to your account straight away. No cap — refer as many people as you like.` },
    { title: "Credits apply to bookings", body: "Move the credit to your Drive Wallet and it comes off your next car or estate booking at checkout." },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Referral programme"
        description={`Share your link. Every friend who joins NXL puts ${reward} in your account — no limit on how many you refer.`}
      />

      {!program.enabled ? (
        <Alert tone="info">The referral programme is paused right now. Credit you have already earned is still yours.</Alert>
      ) : null}

      {available > 0 ? (
        <Panel tone="gold">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">Available referral credits</p>
              <p className="text-metal-soft mt-2 font-mono text-display-4 tabular-nums">{money(available)}</p>
              <p className="mt-1 text-sm text-muted">Move it to your Drive Wallet to spend it on your next booking.</p>
            </div>
            {confirming ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={redeem}>Confirm redeem</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirming(true)}>Redeem credits</Button>
            )}
          </div>
        </Panel>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Friends joined", value: String(referrals.length), gold: false },
          { label: "Total earned", value: money(earned), gold: true },
          { label: "Per referral", value: reward, gold: false },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-surface-1/50 p-4 text-center">
            <p className={`font-mono text-2xl tabular-nums ${stat.gold ? "text-metal-soft" : "text-cream"}`}>{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <Panel>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">Your referral code</p>
        <p className="text-metal-soft mt-2 font-mono text-2xl tracking-[0.18em]">{code}</p>

        <p className="mt-6 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">Your share link</p>
        <div className="mt-2 flex gap-2">
          <Input readOnly value={link} aria-label="Your share link" className="font-mono text-xs" onFocus={(e) => e.target.select()} />
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check aria-hidden width={14} height={14} /> : <Copy aria-hidden width={14} height={14} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <Button className="mt-5 w-full sm:w-auto" onClick={share}>
          <Share2 aria-hidden width={16} height={16} />
          Share link
        </Button>
      </Panel>

      <Panel title="How it works">
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold/40 font-mono text-xs text-gold">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cream">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title={`Friends you referred${referrals.length ? ` (${referrals.length})` : ""}`}>
        {referrals.length ? (
          <ul className="divide-y divide-line">
            {referrals.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={r.friendName} photo={null} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cream">{r.friendName}</p>
                  <p className="text-xs text-muted">Joined {shortDate(r.at)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-success">
                  +{money(r.credit)} {r.redeemed ? "redeemed" : "earned"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No referrals yet" description="Friends who join with your link or code show up here, with the credit each one earned you." />
        )}
        <p className="mt-5 text-xs text-muted-dim">
          Redeemed credit lives in your{" "}
          <Link href="/account/wallet" className="text-gold hover:underline">Drive Wallet</Link>.
        </p>
      </Panel>
    </div>
  );
}
