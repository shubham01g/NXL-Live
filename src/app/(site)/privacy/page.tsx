import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { SITE } from "@/lib/domain/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Next Level Exotic Rentals collects, uses, stores and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      lede="What we collect, why we collect it, how long we keep it, and the choices you have."
      updated="Pending publication"
      sections={[
        {
          heading: "Information we collect",
          body: (
            <>
              <p>
                Account details (name, email, phone), booking history, payment
                identifiers, and the verification documents required to rent — driver
                licence and proof of insurance.
              </p>
              <p>
                We also collect standard technical data such as device type, browser and
                approximate location for security and service quality.
              </p>
            </>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <p>
              To take and fulfil bookings, verify eligibility, process payments and
              deposits, operate the loyalty programme, arrange delivery, and contact you
              about your rental. We do not sell personal information.
            </p>
          ),
        },
        {
          heading: "Location data",
          body: (
            <p>
              During an active rental, vehicle location may be recorded for fleet safety
              and recovery. Collection begins at checkout and ends at return. This is
              described in full at the point of consent.
            </p>
          ),
        },
        {
          heading: "Payment information",
          body: (
            <p>
              Card details are handled by our payment processor and are not stored on our
              own systems. We retain only the card brand and last four digits for your
              reference.
            </p>
          ),
        },
        {
          heading: "Retention",
          body: (
            <p>
              Booking and financial records are retained as long as required by law and
              legitimate business need. Verification documents are retained only while
              needed to support active and recent rentals.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You may request access to, correction of, or deletion of your personal
              information, and may opt out of marketing at any time. Write to{" "}
              <a
                href={`mailto:${SITE.contact.email}`}
                className="gold-underline text-cream/85"
              >
                {SITE.contact.email}
              </a>
              . Applicable state privacy rights will be detailed here following legal
              review.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about this policy can go to{" "}
              <a
                href={`mailto:${SITE.contact.email}`}
                className="gold-underline text-cream/85"
              >
                {SITE.contact.email}
              </a>{" "}
              or {SITE.contact.phone}.
            </p>
          ),
        },
      ]}
    />
  );
}
