import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { ReservationsScreen } from "@/components/admin/screens/reservations";

export const metadata: Metadata = { title: "Reservations" };

export default async function AdminReservationsPage() {
  const [initial, drivers, listings] = await Promise.all([
    repo.listReservations(),
    repo.listDrivers(),
    repo.listListings(),
  ]);
  return <ReservationsScreen initial={initial} drivers={drivers} listings={listings} />;
}
