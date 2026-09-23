"use client";

import { useState } from "react";
import { useMember, updateMember } from "@/lib/auth/use-session";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { SectionHeader, Panel, SavedNote } from "../panel";

/**
 * Billing address.
 *
 * Doubles as the delivery address: the concierge coordinates drop-off from
 * this record, which is why it is worth prompting for even though nothing
 * blocks on it.
 */
export function AddressSection() {
  const member = useMember();

  const [line1, setLine1] = useState(member?.address?.line1 ?? "");
  const [line2, setLine2] = useState(member?.address?.line2 ?? "");
  const [city, setCity] = useState(member?.address?.city ?? "");
  const [state, setState] = useState(member?.address?.state ?? "");
  const [zip, setZip] = useState(member?.address?.zip ?? "");
  const [country, setCountry] = useState(member?.address?.country ?? "United States");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!member) return null;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!line1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Street, city, state and ZIP are all needed.");
      return;
    }

    updateMember((current) => ({
      ...current,
      address: {
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim() || "United States",
      },
    }));

    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Address"
        description="Used for statements, and by the concierge to coordinate delivery and collection."
      />

      <Panel
        tone={member.address ? "gold" : "default"}
        title={member.address ? "Billing & delivery address" : "Add your address"}
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Street address" htmlFor="addr-1" required>
            <Input
              id="addr-1"
              autoComplete="address-line1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="1200 Ocean Drive"
            />
          </Field>

          <Field label="Apartment, suite, unit" htmlFor="addr-2">
            <Input
              id="addr-2"
              autoComplete="address-line2"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" htmlFor="addr-city" required>
              <Input
                id="addr-city"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Miami Beach"
              />
            </Field>

            <Field label="State" htmlFor="addr-state" required>
              <Input
                id="addr-state"
                autoComplete="address-level1"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="FL"
              />
            </Field>

            <Field label="ZIP code" htmlFor="addr-zip" required>
              <Input
                id="addr-zip"
                inputMode="numeric"
                autoComplete="postal-code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="33139"
                className="font-mono tabular-nums"
              />
            </Field>

            <Field label="Country" htmlFor="addr-country">
              <Input
                id="addr-country"
                autoComplete="country-name"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </Field>
          </div>

          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Button type="submit" className="w-full">
            {member.address ? "Update address" : "Save address"}
          </Button>

          {saved ? <SavedNote>Address saved.</SavedNote> : null}
        </form>
      </Panel>
    </div>
  );
}
