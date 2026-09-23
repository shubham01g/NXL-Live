"use client";

import { useState } from "react";
import { CreditCard, Info, Trash2 } from "lucide-react";
import {
  cardBrandLabel,
  cardExpiry,
  detectCardBrand,
  digitsOnly,
  groupCardDigits,
} from "@/lib/domain/account";
import { useMember, updateMember } from "@/lib/auth/use-session";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { SectionHeader, Panel, DetailRow, SavedNote } from "../panel";

/**
 * Payment method.
 *
 * Only the brand, last four and expiry are kept — the full number never
 * leaves the form, and the CVC is never even read into state. That is the
 * shape the processor integration wants at M5 anyway, where the card is
 * tokenised in the browser and we store the token, so nothing here has to be
 * unpicked later.
 */
export function PaymentSection() {
  const member = useMember();
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!member) return null;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const digits = digitsOnly(number);
    if (digits.length < 13 || digits.length > 19) {
      setError("Enter the full card number.");
      return;
    }

    const match = /^(\d{2})\s*\/\s*(\d{2,4})$/.exec(expiry.trim());
    if (!match) {
      setError("Enter the expiry as MM/YY.");
      return;
    }
    const month = Number(match[1]);
    if (month < 1 || month > 12) {
      setError("That expiry month does not exist.");
      return;
    }
    const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
    if (!holder.trim()) {
      setError("Enter the name on the card.");
      return;
    }

    updateMember((current) => ({
      ...current,
      card: {
        id: `card-${Date.now().toString(36)}`,
        brand: detectCardBrand(digits),
        last4: digits.slice(-4),
        expMonth: month,
        expYear: year,
        holder: holder.trim(),
        isDefault: true,
      },
    }));

    setNumber("");
    setHolder("");
    setExpiry("");
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payment"
        description="The card your rental is charged to. The refundable deposit is placed at pickup, never at booking."
      />

      {member.card ? (
        <Panel
          tone="gold"
          title="Card on file"
          action={
            <button
              type="button"
              onClick={() => {
                updateMember((current) => ({ ...current, card: null }));
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
              <CreditCard aria-hidden width={20} height={20} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-base tabular-nums text-cream">
                ···· ···· ···· {member.card.last4}
              </p>
              <p className="text-xs text-muted">{cardBrandLabel(member.card.brand)}</p>
            </div>
          </div>

          <dl className="mt-5">
            <DetailRow label="Name on card">{member.card.holder}</DetailRow>
            <DetailRow label="Expires">
              <span className="font-mono tabular-nums">{cardExpiry(member.card)}</span>
            </DetailRow>
            <DetailRow label="Used for">Rental charges and top-ups</DetailRow>
          </dl>

          {saved ? <SavedNote>Card saved.</SavedNote> : null}
        </Panel>
      ) : (
        <Panel title="Add a card" description="Required before your next rental.">
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Card number" htmlFor="card-number" required>
              <Input
                id="card-number"
                inputMode="numeric"
                autoComplete="cc-number"
                value={groupCardDigits(digitsOnly(number))}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                className="font-mono tabular-nums"
              />
            </Field>

            <Field label="Name on card" htmlFor="card-holder" required>
              <Input
                id="card-holder"
                autoComplete="cc-name"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                placeholder={member.name}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Expiry" htmlFor="card-expiry" required>
                <Input
                  id="card-expiry"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="09/28"
                  className="font-mono tabular-nums"
                />
              </Field>

              <Field
                label="CVC"
                htmlFor="card-cvc"
                hint="Never stored."
              >
                <Input
                  id="card-cvc"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  className="font-mono tabular-nums"
                />
              </Field>
            </div>

            {error ? <Alert tone="danger">{error}</Alert> : null}

            <Alert tone="info" className="items-start">
              <span className="flex items-start gap-2">
                <Info aria-hidden width={13} height={13} className="mt-0.5 shrink-0" />
                No card is charged and nothing is sent anywhere yet. Only the brand, last
                four digits and expiry are kept, on this device. The payment processor
                goes live at the final milestone.
              </span>
            </Alert>

            <Button type="submit" className="w-full">
              Save card
            </Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
