import type { Metadata } from "next";
import { PartnerProfile } from "@/components/partner/screens";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <PartnerProfile />;
}
