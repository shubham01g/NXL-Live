"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PARTNER_TYPES } from "@/lib/data/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";

/** Referral code from the business name: six alphanumerics plus two digits. */
function codeFrom(business: string): string {
  const stem = business.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${stem || "PARTNER"}${suffix}`;
}

/**
 * Partner application.
 *
 * Submits locally for M1 — the partner record, referral code and commission
 * ledger are created server-side at M3/M4. The generated code below is a
 * preview of what the business will receive on approval.
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
          <p className="mt-2 font-display text-3xl font-semibold tracking-wide text-gold">
            {submitted.code}
          </p>
          <p className="mt-3 text-xs text-muted">
            Status: pending review · Commission: 12% per rental
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
          setSubmitted({ business, code: codeFrom(business) });
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
