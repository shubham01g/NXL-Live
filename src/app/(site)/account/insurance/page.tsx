import type { Metadata } from "next";
import { InsuranceSection } from "@/components/account/sections/insurance-section";

export const metadata: Metadata = { title: "Insurance" };

export default function AccountInsurancePage() {
  return <InsuranceSection />;
}
