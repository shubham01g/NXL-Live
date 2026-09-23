import type { Metadata } from "next";
import { OverviewSection } from "@/components/account/sections/overview-section";

export const metadata: Metadata = { title: "Your account" };

export default function AccountOverviewPage() {
  return <OverviewSection />;
}
