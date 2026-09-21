"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import {
  leadUnit,
  quote,
  rateFor,
  unitAdverb,
  unitSuffix,
  unitsFor,
} from "@/lib/domain/pricing";
import type { InsuranceChoice, Listing } from "@/lib/domain/types";
import { SegmentedControl, Stepper, Toggle } from "@/components/ui/controls";
import { buttonStyles } from "@/components/ui/button";
import { Price } from "@/components/ui/primitives";

/**
 * Live price calculator for a listing.
 *
 * M1 renders the complete breakdown; the Reserve action hands off to the
 * concierge request form. M2 replaces that handoff with the real checkout,
 * submitting this exact quote — which is why the maths lives in
 * lib/domain/pricing rather than in this component.
 */
export function BookingPanel({ listing }: { listing: Listing }) {
  const units = unitsFor(listing);
  const [unit, setUnit] = useState(leadUnit(listing));
  const [qty, setQty] = useState(1);
  const [insurance, setInsurance] = useState<InsuranceChoice>("own");
  const [delivery, setDelivery] = useState(false);
  const [pickup, setPickup] = useState(false);

  const isCar = listing.kind === "car";
  const unavailable = listing.status !== "available";

  const q = useMemo(
    () =>
      quote({
        listing,
        unit,
        qty,
        insurance,
        delivery: isCar ? { enabled: delivery } : undefined,
        pickup: isCar ? { enabled: pickup } : undefined,
      }),
    [listing, unit, qty, insurance, delivery, pickup, isCar],
  );

  const requestHref = {
    pathname: "/contact",
    query: { listing: listing.slug, kind: listing.kind, unit, qty: String(qty) },
  };

  return (
    <div className="rounded-xl border border-line bg-surface-1/80 p-6 backdrop-blur">
      <div className="flex items-end justify-between gap-4">
        <Price amount={rateFor(listing, unit)} suffix={unitSuffix(unit)} size="lg" />
        <span className="rounded-full border border-line px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted">
          Flat rate
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-dim">
        No surge, no demand pricing. This is the price you pay.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
            Rental period
          </p>
          <SegmentedControl
            label="Rental period"
            size="sm"
            value={unit}
            onChange={(next) => setUnit(next)}
            options={units.map((u) => ({ value: u, label: unitAdverb(u) }))}
          />
        </div>

        <div>
          <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
            How many {unit === "hour" ? "hours" : `${unit}s`}?
          </p>
          <Stepper
            label={`Number of ${unit}s`}
            value={qty}
            onChange={setQty}
            min={1}
            max={unit === "hour" ? 12 : 90}
          />
        </div>

        <div>
          <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
            Insurance
          </p>
          <SegmentedControl
            label="Insurance"
            size="sm"
            value={insurance}
            onChange={(next) => setInsurance(next)}
            options={[
              { value: "own", label: "My own policy" },
              { value: "nxl", label: "NXL coverage" },
            ]}
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-dim">
            <ShieldCheck aria-hidden width={13} height={13} className="mt-0.5 shrink-0" />
            {insurance === "own"
              ? "No additional fee. We verify your policy before delivery."
              : "Collision, theft, liability and roadside — no deductible on approved claims."}
          </p>
        </div>

        {isCar ? (
          <div className="space-y-3 rounded-lg border border-line bg-ink/40 p-4">
            <ToggleRow
              label="Delivery"
              hint="We bring it to you"
              checked={delivery}
              onChange={setDelivery}
            />
            <ToggleRow
              label="Pickup"
              hint="We collect it after"
              checked={pickup}
              onChange={setPickup}
            />
          </div>
        ) : null}
      </div>

      {/* ------------------------------ breakdown ------------------------------ */}
      <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
        {q.lineItems.map((item) => (
          <div key={item.key} className="flex items-baseline justify-between gap-4">
            <dt className={cn("text-muted", item.kind === "info" && "text-muted-dim")}>
              {item.label}
            </dt>
            <dd
              className={cn(
                "shrink-0 font-mono tabular-nums",
                item.kind === "info" ? "text-xs text-muted-dim" : "text-cream",
              )}
            >
              {item.kind === "info" ? (item.note ?? money(item.amount)) : money(item.amount)}
            </dd>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3.5">
          <dt className="font-semibold text-cream">Due at booking</dt>
          <dd className="font-mono text-lg font-semibold tabular-nums text-gold">
            {money(q.dueNow)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Refundable deposit</dt>
          <dd className="shrink-0 font-mono tabular-nums text-cream/70">
            {money(q.depositDue)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-2 rounded-md border border-warning/20 bg-warning-dim/40 p-3 text-xs leading-relaxed text-warning">
        <Info aria-hidden width={13} height={13} className="mt-0.5 shrink-0" />
        The deposit is placed at pickup, not charged today, and released after a clean
        return.
      </p>

      {unavailable ? (
        <div className="mt-5 rounded-md border border-danger/25 bg-danger-dim/40 p-4 text-center">
          <p className="text-sm font-semibold text-danger">
            {listing.status === "booked" ? "Currently booked" : "In service"}
          </p>
          <p className="mt-1 text-xs text-cream/70">
            Ask the concierge and we will tell you the moment it frees up.
          </p>
        </div>
      ) : null}

      <Link
        href={requestHref}
        className={cn(buttonStyles({ size: "lg" }), "mt-5 w-full")}
      >
        {unavailable ? "Join the waitlist" : "Reserve now"}
        <ArrowRight aria-hidden width={16} height={16} />
      </Link>

      <p className="mt-3 text-center text-xs text-muted-dim">
        No payment taken at this step.
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-cream">{label}</p>
        <p className="text-xs text-muted-dim">{hint}</p>
      </div>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}
