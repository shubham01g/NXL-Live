import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { PRICING } from "@/lib/domain/pricing";
import { money } from "@/lib/domain/format";

export const metadata: Metadata = {
  title: "Insurance & Coverage",
  description: `Rent with your own qualifying policy, or add NXL coverage at ${money(PRICING.insuranceDaily)} per day — collision, theft, liability and roadside with no deductible on approved claims.`,
  alternates: { canonical: "/insurance" },
};

export default function InsurancePage() {
  return (
    <LegalPage
      eyebrow="Coverage"
      title="Insurance & Coverage"
      lede="Every rental must be insured. You can bring your own qualifying policy, or add ours at checkout."
      updated="Pending publication"
      sections={[
        {
          heading: "Your own policy",
          body: (
            <>
              <p>
                There is no additional charge to rent on your own insurance. You will be
                asked to upload your declaration page, and we verify it before delivery —
                usually within one business day.
              </p>
              <p>
                The policy must carry comprehensive and collision coverage valid for the
                vehicle class being rented. We will tell you before delivery if it does
                not qualify.
              </p>
            </>
          ),
        },
        {
          heading: "NXL coverage",
          body: (
            <p>
              Our coverage is {money(PRICING.insuranceDaily)} per rental day, added to
              your total at checkout. It activates instantly, so there is no verification
              wait.
            </p>
          ),
        },
        {
          heading: "What NXL coverage includes",
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Collision damage up to the full value of the vehicle</li>
              <li>Comprehensive theft protection</li>
              <li>Third-party liability</li>
              <li>Roadside assistance and towing</li>
              <li>No deductible on approved claims</li>
            </ul>
          ),
        },
        {
          heading: "What is not covered",
          body: (
            <p>
              Exclusions — including prohibited use, intoxicated operation, unauthorised
              drivers, wheel and tyre damage, and interior damage — will be itemised here.
              Final exclusion list is pending underwriter confirmation.
            </p>
          ),
        },
        {
          heading: "Deposits and damage",
          body: (
            <p>
              Coverage is separate from the refundable security deposit of{" "}
              {money(PRICING.defaultDeposit)} on vehicles. Where damage is assessed, the
              amount is deducted from the deposit and the balance returned with a written
              breakdown.
            </p>
          ),
        },
        {
          heading: "Making a claim",
          body: (
            <p>
              Report any incident to the concierge line immediately, and before the
              vehicle is moved where it is safe to do so. Claim handling steps and
              timeframes will be set out here.
            </p>
          ),
        },
      ]}
    />
  );
}
