import type { Metadata } from "next";
import { RewardsSection } from "@/components/account/sections/rewards-section";

export const metadata: Metadata = { title: "Level Rewards" };

export default function AccountRewardsPage() {
  return <RewardsSection />;
}
