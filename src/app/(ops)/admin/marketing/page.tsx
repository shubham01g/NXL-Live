import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { MarketingScreen } from "@/components/admin/screens/growth";

export const metadata: Metadata = { title: "Marketing" };

export default async function AdminMarketingPage() {
  return <MarketingScreen initial={await repo.listPromos()} />;
}
