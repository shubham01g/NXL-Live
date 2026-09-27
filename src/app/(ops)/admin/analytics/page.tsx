import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { AnalyticsScreen } from "@/components/admin/screens/revenue";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [revenue, reservations, partners] = await Promise.all([
    repo.getRevenue(),
    repo.listReservations(),
    repo.listPartners(),
  ]);
  return (
    <AnalyticsScreen
      revenue={revenue}
      reservations={reservations}
      partners={partners}
    />
  );
}
