import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { PartnersScreen } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Partners" };

export default async function AdminPartnersPage() {
  const [initial, reservations] = await Promise.all([repo.listPartners(), repo.listReservations()]);
  return <PartnersScreen initial={initial} reservations={reservations} />;
}
