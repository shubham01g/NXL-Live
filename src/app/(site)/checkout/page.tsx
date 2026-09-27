import type { Metadata } from "next";
import { repo } from "@/lib/data";
import type { InsuranceChoice, RateUnit } from "@/lib/domain/types";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

const UNITS: RateUnit[] = ["hour", "day", "week", "month"];

/**
 * /checkout?listing=<slug>&unit=day&qty=2&insurance=nxl&delivery=1
 *
 * The listing page's booking panel links here with the guest's selections,
 * so nothing they chose is lost on the way in.
 */
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : null);
  const [listings, promos] = await Promise.all([repo.listListings(), repo.listPromos()]);

  const unit = str("unit");
  const qty = Number(str("qty"));
  const insurance = str("insurance");

  return (
    <CheckoutFlow
      listings={listings}
      promos={promos}
      initial={{
        slug: str("listing"),
        unit: UNITS.includes(unit as RateUnit) ? (unit as RateUnit) : null,
        qty: Number.isFinite(qty) && qty > 0 ? Math.min(90, Math.floor(qty)) : null,
        insurance: insurance === "nxl" || insurance === "own" ? (insurance as InsuranceChoice) : null,
        delivery: str("delivery") === "1",
        pickup: str("pickup") === "1",
      }}
    />
  );
}
