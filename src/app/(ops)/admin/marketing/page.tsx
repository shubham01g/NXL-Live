import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { MarketingScreen } from "@/components/admin/screens/growth";

export const metadata: Metadata = { title: "Marketing" };

export default async function AdminMarketingPage() {
  const [initial, partners] = await Promise.all([repo.listPromos(), repo.listPartners()]);
  return <MarketingScreen initial={initial} partners={partners} />;
}
