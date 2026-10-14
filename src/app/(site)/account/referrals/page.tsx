import type { Metadata } from "next";
import { ReferralsSection } from "@/components/account/sections/referrals-section";

export const metadata: Metadata = { title: "Referrals" };

export default function AccountReferralsPage() {
  return <ReferralsSection />;
}
