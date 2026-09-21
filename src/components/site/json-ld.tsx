/**
 * Structured data helper.
 *
 * The prototype put a single Organization/CarRental/FAQPage block on one
 * hash-routed URL, so no individual listing was ever described to a crawler.
 * Each page now emits its own graph.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Values come from our own fixtures, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
