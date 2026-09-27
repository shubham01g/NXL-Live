import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { WalletSection } from "@/components/account/sections/wallet-section";

export const metadata: Metadata = { title: "Drive Wallet" };

export default async function AccountWalletPage({ searchParams }: PageProps<"/account/wallet">) {
  const [plans, params] = await Promise.all([repo.listPlans(), searchParams]);
  // /subscriptions links here with ?plan=<id> to open the purchase straight away.
  const plan = typeof params.plan === "string" && plans.some((p) => p.id === params.plan) ? params.plan : null;
  return <WalletSection plans={plans} initialPlan={plan} />;
}
