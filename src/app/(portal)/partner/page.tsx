import type { Metadata } from "next";
import { PartnerOverview } from "@/components/partner/screens";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <PartnerOverview />;
}
