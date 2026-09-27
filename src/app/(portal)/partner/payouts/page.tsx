import type { Metadata } from "next";
import { PartnerPayouts } from "@/components/partner/screens";

export const metadata: Metadata = { title: "Payouts" };

export default function Page() {
  return <PartnerPayouts />;
}
