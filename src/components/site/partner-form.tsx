"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PARTNER_TYPES } from "@/lib/data/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";
import type { Partner } from "@/lib/domain/types";
import { PARTNERS } from "@/lib/data/fixtures/operations";
import { C, logAudit, raiseAlert } from "@/lib/data/demo";
import { create, newId, readCollection } from "@/lib/data/demo-store";
import { codeFor, DEFAULT_COMMISSION } from "@/lib/data/partners";

/**
 * Partner application.
 *
 * Creates a pending partner in the demo store, so it lands in the back
 * office's "Applications awaiting review" list; approving it there makes the
 * code live and opens the partner portal to it. M3 moves this to the API.
 */
export function PartnerForm() {
  const [submitted, setSubmitted] = useState<{ business: string; code: string } | null>(
    null,
  );
  const [business, setBusiness] = useState("");

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2
          aria-hidden
          width={32}
          height={32}
          className="mx-auto text-success"
        />
        <h3 className="mt-5 font-display text-2xl font-semibold text-cream">
          Application received
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Thanks, {submitted.business}. Our partnerships team reviews applications within
          one business day.
        </p>

        <div className="mt-7 rounded-lg border border-gold/25 bg-gold/5 p-6">
          <p className="font-mono text-2xs uppercase text-muted">Your referral code</p>
          <p className="text-metal-soft mt-2 font-display text-3xl font-semibold tracking-wide">
            {submitted.code}
          </p>
          <p className="mt-3 text-xs text-muted">
            Status: pending review · Commission from {DEFAULT_COMMISSION}% per rental
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="mt-6 text-sm text-gold transition-opacity hover:opacity-80"
        >
          Submit another application
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h2 className="font-display text-2xl font-semibold text-cream">
        Apply in two minutes
      </h2>
      <p className="mt-2 text-sm text-muted">
        Free to join. No minimums, no exclusivity, no setup fee.
      </p>

      <form
        className="mt-7 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const taken = readCollection<Partner>(C.partners, PARTNERS).map((p) => p.code);
          const code = codeFor(business, taken);
          create<Partner>(C.partners, {
            id: newId("ptn"),
            business: business.trim(),
            contact: String(form.get("contact") ?? "").trim(),
            email: String(form.get("email") ?? "").trim(),
            phone: String(form.get("phone") ?? "").trim(),
            type: String(form.get("type") ?? ""),
            status: "pending",
            code,
            commission: DEFAULT_COMMISSION,
            referrals: 0,
            earnings: 0,
            paidOut: 0,
            joinedAt: Date.now(),
          });
          raiseAlert("partner", "New partner application", `${business.trim()} applied to the partner programme.`);
          logAudit(String(form.get("contact") ?? "Applicant"), "partner.applied", business.trim(), `Code ${code} reserved`);
          setSubmitted({ business, code });
        }}
      >
        <Field label="Business name" htmlFor="partner-business" required>
          <Input
            id="partner-business"
            name="business"
            required
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="The Setai Miami Beach"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contact name" htmlFor="partner-contact" required>
            <Input id="partner-contact" name="contact" required placeholder="Jane Smith" />
          </Field>

          <Field label="Business type" htmlFor="partner-type" required>
            <Select id="partner-type" name="type" required defaultValue="">
              <option value="" disabled>
                Select a category
              </option>
              {PARTNER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Work email" htmlFor="partner-email" required>
            <Input
              id="partner-email"
              name="email"
              type="email"
              required
              placeholder="jane@setai.com"
            />
          </Field>

          <Field label="Phone" htmlFor="partner-phone">
            <Input
              id="partner-phone"
              name="phone"
              type="tel"
              placeholder="(305) 555-0134"
            />
          </Field>
        </div>

        <Button type="submit" size="lg" className="w-full">
          Apply to partner
          <ArrowRight aria-hidden width={16} height={16} />
        </Button>

        <p className="text-center text-xs text-muted-dim">
          We review every application by hand. Expect a reply within one business day.
        </p>
      </form>
    </Card>
  );
}
