"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { cardBrandLabel, detectCardBrand, digitsOnly, groupCardDigits, type CardInput } from "@/lib/domain/account";
import { Field, Input } from "@/components/ui/field";

/**
 * The card form, shared by checkout, wallet top-ups and the back office's
 * concierge bookings. A live card face previews brand and last four so the
 * guest can see the number they typed is the card in their hand.
 */
export function CardFields({
  value,
  onChange,
  compact = false,
}: {
  value: CardInput;
  onChange: (next: CardInput) => void;
  compact?: boolean;
}) {
  const id = useId();
  const digits = digitsOnly(value.number);
  const brand = digits ? detectCardBrand(digits) : null;
  const set = (k: keyof CardInput) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });

  return (
    <div className={cn("grid gap-5", !compact && "lg:grid-cols-[1fr_15rem] lg:items-start")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Card number" htmlFor={`${id}-n`} required className="sm:col-span-2">
          <Input
            id={`${id}-n`}
            inputMode="numeric"
            autoComplete="cc-number"
            value={groupCardDigits(digits.slice(0, 19))}
            onChange={set("number")}
            placeholder="4242 4242 4242 4242"
            className="font-mono tabular-nums"
          />
        </Field>
        <Field label="Name on card" htmlFor={`${id}-h`} required className="sm:col-span-2">
          <Input id={`${id}-h`} autoComplete="cc-name" value={value.holder} onChange={set("holder")} />
        </Field>
        <Field label="Expiry" htmlFor={`${id}-e`} required>
          <Input
            id={`${id}-e`}
            inputMode="numeric"
            autoComplete="cc-exp"
            value={value.expiry}
            onChange={(e) => {
              const d = digitsOnly(e.target.value).slice(0, 4);
              onChange({ ...value, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
            }}
            placeholder="MM/YY"
            className="font-mono tabular-nums"
          />
        </Field>
        <Field label="CVC" htmlFor={`${id}-c`} required hint="Never stored.">
          <Input
            id={`${id}-c`}
            inputMode="numeric"
            autoComplete="cc-csc"
            type="password"
            maxLength={4}
            value={value.cvc}
            onChange={(e) => onChange({ ...value, cvc: digitsOnly(e.target.value).slice(0, 4) })}
            placeholder="•••"
            className="font-mono tabular-nums"
          />
        </Field>
      </div>

      {!compact ? (
        <div
          aria-hidden
          className="metal-plate relative hidden aspect-[1.586] flex-col justify-between overflow-hidden rounded-xl p-5 text-ink shadow-glow-gold lg:flex"
        >
          <div className="flex items-start justify-between">
            <span className="font-display text-lg font-bold">NXL</span>
            <span className="font-mono text-[0.625rem] uppercase tracking-widest">{brand ? cardBrandLabel(brand) : "Card"}</span>
          </div>
          <div>
            <p className="font-mono text-base tabular-nums tracking-wider">
              {digits ? groupCardDigits(digits.padEnd(16, "•").slice(0, 16)) : "•••• •••• •••• ••••"}
            </p>
            <div className="mt-2 flex justify-between font-mono text-[0.625rem] uppercase">
              <span className="truncate">{value.holder || "Name on card"}</span>
              <span>{value.expiry || "MM/YY"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
