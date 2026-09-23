import type { Metadata } from "next";
import { SecuritySection } from "@/components/account/sections/security-section";

export const metadata: Metadata = { title: "Settings" };

export default function AccountSecurityPage() {
  return <SecuritySection />;
}
