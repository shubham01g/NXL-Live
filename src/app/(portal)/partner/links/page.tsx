import type { Metadata } from "next";
import { PartnerLinks } from "@/components/partner/screens";

export const metadata: Metadata = { title: "Links & QR" };

export default function Page() {
  return <PartnerLinks />;
}
