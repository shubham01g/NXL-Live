import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { ReservationsScreen } from "@/components/admin/screens/reservations";

export const metadata: Metadata = { title: "Reservations" };

export default async function AdminReservationsPage() {
  const [initial, drivers] = await Promise.all([
    repo.listReservations(),
    repo.listDrivers(),
  ]);
  return (
    <ReservationsScreen
      initial={initial}
      drivers={drivers}
    />
  );
}
