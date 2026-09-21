import { SITE } from "@/lib/domain/site";
import { PRICING } from "@/lib/domain/pricing";
import { money } from "@/lib/domain/format";
import { JsonLd } from "./json-ld";

/**
 * Site-level structured data, emitted on the homepage.
 *
 * Every figure comes from lib/domain, so the schema cannot drift from the
 * rate card the way the prototype's hardcoded JSON-LD did.
 */
export function HomeSchema({
  carCount,
  homeCount,
}: {
  carCount: number;
  homeCount: number;
}) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          alternateName: SITE.shortName,
          url: SITE.url,
          description: SITE.description,
          telephone: SITE.contact.phone,
          email: SITE.contact.email,
          address: {
            "@type": "PostalAddress",
            streetAddress: SITE.contact.address.street,
            addressLocality: SITE.contact.address.city,
            addressRegion: SITE.contact.address.state,
            postalCode: SITE.contact.address.zip,
            addressCountry: SITE.contact.address.country,
          },
          sameAs: [SITE.social.instagram, SITE.social.x],
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AutoRental",
          name: SITE.name,
          url: SITE.url,
          description: `Exotic car and luxury estate rental in ${SITE.serviceArea}. ${carCount} certified cars and ${homeCount} private estates, bookable by the hour, day, week or month.`,
          priceRange: "$$$",
          telephone: SITE.contact.phone,
          openingHours: "Mo-Su 07:00-24:00",
          paymentAccepted: "Credit Card",
          currenciesAccepted: "USD",
          areaServed: { "@type": "Place", name: SITE.serviceArea },
          address: {
            "@type": "PostalAddress",
            streetAddress: SITE.contact.address.street,
            addressLocality: SITE.contact.address.city,
            addressRegion: SITE.contact.address.state,
            postalCode: SITE.contact.address.zip,
            addressCountry: SITE.contact.address.country,
          },
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do I rent an exotic car from NXL?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Browse the fleet, choose your rental window — hourly, daily, weekly or monthly — select insurance, and confirm. We deliver to you or you collect from our South Beach depot.",
              },
            },
            {
              "@type": "Question",
              name: "Can I rent an exotic car by the hour?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. There is no 24-hour minimum. Cars book from one hour, with daily, weekly and monthly windows also available.",
              },
            },
            {
              "@type": "Question",
              name: "What is the security deposit for an exotic car rental?",
              acceptedAnswer: {
                "@type": "Answer",
                text: `A refundable deposit of ${money(PRICING.defaultDeposit)} applies to vehicles. It is placed at pickup rather than charged at booking, and released after a clean return.`,
              },
            },
            {
              "@type": "Question",
              name: "Do I need my own insurance to rent?",
              acceptedAnswer: {
                "@type": "Answer",
                text: `You can rent on your own comprehensive policy at no extra charge, or add NXL coverage at ${money(PRICING.insuranceDaily)} per rental day, which includes collision, theft, liability and roadside assistance.`,
              },
            },
            {
              "@type": "Question",
              name: "Do you deliver the car?",
              acceptedAnswer: {
                "@type": "Answer",
                text: `Delivery and collection are ${money(PRICING.delivery.fee)} each within ${PRICING.delivery.baseMiles} miles of our South Beach depot, and ${money(PRICING.delivery.extraPerMile)} per mile beyond. Both are complimentary for members at Silver tier and above.`,
              },
            },
          ],
        }}
      />
    </>
  );
}
