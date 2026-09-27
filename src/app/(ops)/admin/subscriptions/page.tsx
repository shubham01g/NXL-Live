import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { SubscriptionsScreen } from "@/components/admin/screens/revenue";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function AdminSubscriptionsPage() {
  const [purchases, plans, customers] = await Promise.all([repo.listPlanPurchases(), repo.listPlans(), repo.listCustomers()]);
  return <SubscriptionsScreen purchases={purchases} plans={plans} customers={customers} />;
}
