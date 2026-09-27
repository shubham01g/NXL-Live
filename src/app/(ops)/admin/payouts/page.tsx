import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { PayoutsScreen } from "@/components/admin/screens/revenue";

export const metadata: Metadata = { title: "Payouts" };

export default async function AdminPayoutsPage() {
  return <PayoutsScreen initial={await repo.listPayouts()} />;
}
