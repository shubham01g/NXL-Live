import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { PRICING } from "@/lib/domain/pricing";
import { money } from "@/lib/domain/format";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing rentals, bookings, deposits and cancellations with Next Level Exotic Rentals.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      lede="The agreement between you and NXL covering bookings, rentals, deposits, cancellations and conduct."
      updated="Pending publication"
      sections={[
        {
          heading: "Eligibility",
          body: (
            <>
              <p>
                Renters must be at least 25 years of age and hold a valid, unexpired
                driver licence. International licences are accepted. Additional drivers
                must be registered and meet the same requirements before taking the wheel.
              </p>
              <p>
                We verify licence and insurance documentation before every delivery and
                may decline a rental where verification fails.
              </p>
            </>
          ),
        },
        {
          heading: "Bookings and pricing",
          body: (
            <>
              <p>
                Rates are fixed. The price shown on a listing is the price charged, and
                every additional fee is itemised before you confirm. We do not apply surge
                or demand-based pricing.
              </p>
              <p>
                Rental windows are billed in the unit selected at booking. Monthly windows
                bill as 30 days.
              </p>
            </>
          ),
        },
        {
          heading: "Security deposit",
          body: (
            <p>
              A refundable deposit applies to every rental — {money(PRICING.defaultDeposit)}{" "}
              on vehicles and {money(1500)} on estates. The deposit is placed at pickup,
              not charged at booking, and is released after inspection on a clean return.
              Where damage is assessed, the amount is deducted and the balance returned
              with a written breakdown.
            </p>
          ),
        },
        {
          heading: "Insurance",
          body: (
            <p>
              Every renter must carry either their own qualifying policy or purchase NXL
              coverage at {money(PRICING.insuranceDaily)} per rental day. Full coverage
              terms are set out on the Insurance &amp; Coverage page.
            </p>
          ),
        },
        {
          heading: "Delivery and collection",
          body: (
            <p>
              Delivery and collection are each {money(PRICING.delivery.fee)} within{" "}
              {PRICING.delivery.baseMiles} miles of our South Beach depot, and{" "}
              {money(PRICING.delivery.extraPerMile)} per mile beyond it. Both are
              complimentary for members at Silver tier and above.
            </p>
          ),
        },
        {
          heading: "Cancellations",
          body: (
            <p>
              Cancellation windows, refund eligibility and any applicable fees will be
              stated here. This section requires the client&apos;s commercial policy and
              legal review before publication.
            </p>
          ),
        },
        {
          heading: "Prohibited use",
          body: (
            <p>
              Vehicles may not be used for racing, track events, towing, off-road driving,
              commercial transport, sub-letting, or transport of unlawful goods. Smoking
              is prohibited in all vehicles and estates. Breach may result in forfeiture of
              the deposit and immediate termination of the rental.
            </p>
          ),
        },
        {
          heading: "Liability",
          body: (
            <p>
              Limitation of liability, indemnity and dispute resolution terms will be set
              out here, drafted by counsel under Florida law.
            </p>
          ),
        },
      ]}
    />
  );
}
