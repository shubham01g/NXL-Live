import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { CustomersScreen } from "@/components/admin/screens/customers";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const [initial, reservations, listings, drivers, partners] = await Promise.all([
    repo.listCustomers(),
    repo.listReservations(),
    repo.listListings(),
    repo.listDrivers(),
    repo.listPartners(),
  ]);
  return (
    <CustomersScreen
      initial={initial}
      reservations={reservations}
      listings={listings}
      drivers={drivers}
      partners={partners}
    />
  );
}
