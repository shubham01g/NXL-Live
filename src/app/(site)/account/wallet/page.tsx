import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { WalletSection } from "@/components/account/sections/wallet-section";

export const metadata: Metadata = { title: "Drive Wallet" };

export default async function AccountWalletPage() {
  const plans = await repo.listPlans();
  return <WalletSection plans={plans} />;
}
