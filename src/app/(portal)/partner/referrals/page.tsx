import type { Metadata } from "next";
import { PartnerReferrals } from "@/components/partner/screens";

export const metadata: Metadata = { title: "Referrals" };

export default function Page() {
  return <PartnerReferrals />;
}
