"use client";

import { useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { money, shortDate } from "@/lib/domain/format";
import { PRICING } from "@/lib/domain/pricing";
import type { InsuranceChoice } from "@/lib/domain/types";
import { useMember, updateMember } from "@/lib/auth/use-session";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { SectionHeader, Panel, DetailRow, SavedNote } from "../panel";
import { LicencePanel, PolicyDocument } from "./licence-panel";

/**
 * Insurance on file.
 *
 * The daily rate is read from pricing.ts, the same figure the booking panel
 * quotes — a member must never see one number here and another at checkout.
 */
export function InsuranceSection() {
  const member = useMember();
  const [kind, setKind] = useState<InsuranceChoice>("own");
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!member) return null;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (kind === "own") {
      if (!carrier.trim()) {
        setError("Enter your insurer.");
        return;
      }
      if (!policyNumber.trim()) {
        setError("Enter your policy number.");
        return;
      }
    }

    const expiresAt = expires ? new Date(`${expires}T00:00:00`).getTime() : null;

    updateMember((current) => ({
      ...current,
      insurance:
        kind === "nxl"
          ? {
              kind: "nxl",
              carrier: null,
              policyNumber: null,
              expiresAt: null,
              verified: true,
            }
          : {
              kind: "own",
              carrier: carrier.trim(),
              policyNumber: policyNumber.trim(),
              expiresAt: Number.isNaN(expiresAt) ? null : expiresAt,
              // Own policies are checked by a human before delivery.
              verified: false,
            },
    }));

    setSaved(true);
  }

  const policy = member.insurance;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Insurance & licence"
        description="Every rental needs coverage and a verified licence. Use your own policy at no extra cost, or take the NXL package by the day."
      />

      {policy ? (
        <Panel
          tone="gold"
          title={policy.kind === "nxl" ? "NXL coverage" : "Own policy"}
          action={
            <button
              type="button"
              onClick={() => {
                updateMember((current) => ({ ...current, insurance: null }));
                setSaved(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger/50 hover:text-danger"
            >
              <Trash2 aria-hidden width={13} height={13} />
              Remove
            </button>
          }
        >
          <div className="flex items-center gap-4">
            <span className="metal-plate grid h-11 w-11 shrink-0 place-items-center rounded-lg">
              <ShieldCheck aria-hidden width={20} height={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-cream">
                {policy.kind === "nxl"
                  ? "Collision, theft, liability and roadside"
                  : (policy.carrier ?? "Own policy")}
              </p>
              <p className="text-xs text-muted">
                {policy.kind === "nxl"
                  ? `${money(PRICING.insuranceDaily)} per day, added at checkout`
                  : policy.verified
                    ? "Verified"
                    : "Pending verification before your next delivery"}
              </p>
            </div>
          </div>

          <dl className="mt-5">
            {policy.kind === "own" ? (
              <>
                <DetailRow label="Policy number">
                  <span className="font-mono tabular-nums">{policy.policyNumber}</span>
                </DetailRow>
                <DetailRow label="Expires">
                  {policy.expiresAt ? shortDate(policy.expiresAt) : "Not provided"}
                </DetailRow>
                <DetailRow label="Additional fee">None</DetailRow>
              </>
            ) : (
              <>
                <DetailRow label="Daily rate">{money(PRICING.insuranceDaily)}</DetailRow>
                <DetailRow label="Deductible">None on approved claims</DetailRow>
                <DetailRow label="Charged">Per rental day, at checkout</DetailRow>
              </>
            )}
          </dl>

          {policy.kind === "own" ? <PolicyDocument /> : null}

          {saved ? <SavedNote>Insurance saved.</SavedNote> : null}
        </Panel>
      ) : (
        <Panel title="Add coverage" description="Required before your next rental.">
          <form onSubmit={onSubmit} className="space-y-5">
            <SegmentedControl<InsuranceChoice>
              label="Insurance"
              value={kind}
              onChange={(next) => {
                setKind(next);
                setError(null);
              }}
              options={[
                { value: "own", label: "My own policy" },
                { value: "nxl", label: "NXL coverage" },
              ]}
            />

            {kind === "own" ? (
              <>
                <Field label="Insurer" htmlFor="ins-carrier" required>
                  <Input
                    id="ins-carrier"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="e.g. State Farm"
                  />
                </Field>

                <Field label="Policy number" htmlFor="ins-policy" required>
                  <Input
                    id="ins-policy"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="SF-000000000"
                    className="font-mono"
                  />
                </Field>

                <Field
                  label="Expires"
                  htmlFor="ins-expires"
                  hint="Optional. We will remind you before it lapses."
                >
                  <Input
                    id="ins-expires"
                    type="date"
                    value={expires}
                    onChange={(e) => setExpires(e.target.value)}
                  />
                </Field>

                <Alert tone="info">
                  No additional fee. We verify the policy before delivery.
                </Alert>
              </>
            ) : (
              <Alert tone="info" title={`${money(PRICING.insuranceDaily)} per rental day`}>
                Collision, theft, liability and roadside, with no deductible on approved
                claims. Added to each booking at checkout — nothing is charged now.
              </Alert>
            )}

            {error ? <Alert tone="danger">{error}</Alert> : null}

            <Button type="submit" className="w-full">
              Save coverage
            </Button>
          </form>
        </Panel>
      )}

      <LicencePanel />
    </div>
  );
}
