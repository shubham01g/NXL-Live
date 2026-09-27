import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { AnalyticsScreen } from "@/components/admin/screens/revenue";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [revenue, reservations, partners, customers, listings, purchases] = await Promise.all([
    repo.getRevenue(),
    repo.listReservations(),
    repo.listPartners(),
    repo.listCustomers(),
    repo.listListings(),
    repo.listPlanPurchases(),
  ]);
  return (
    <AnalyticsScreen
      revenue={revenue}
      reservations={reservations}
      partners={partners}
      customers={customers}
      listings={listings}
      purchases={purchases}
    />
  );
}
