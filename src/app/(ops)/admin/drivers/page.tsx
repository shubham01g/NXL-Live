import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { DriversScreen } from "@/components/admin/screens/drivers";

export const metadata: Metadata = { title: "Drivers" };

export default async function AdminDriversPage() {
  const [initial, reservations] = await Promise.all([
    repo.listDrivers(),
    repo.listReservations(),
  ]);
  return (
    <DriversScreen
      initial={initial}
      reservations={reservations}
    />
  );
}
