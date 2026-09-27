import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { OverviewScreen } from "@/components/admin/screens/overview";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [reservations, listings, drivers, alerts, revenue, payouts] = await Promise.all([
    repo.listReservations(),
    repo.listListings(),
    repo.listDrivers(),
    repo.listAlerts(),
    repo.getRevenue(),
    repo.listPayouts(),
  ]);
  return (
    <OverviewScreen
      reservations={reservations}
      listings={listings}
      drivers={drivers}
      alerts={alerts}
      revenue={revenue}
      payouts={payouts}
    />
  );
}
