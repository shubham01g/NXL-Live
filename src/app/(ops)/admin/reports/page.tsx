import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { ReportsScreen } from "@/components/admin/screens/revenue";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const [reservations, customers, payouts, purchases, audit, partners, listings] = await Promise.all([
    repo.listReservations(),
    repo.listCustomers(),
    repo.listPayouts(),
    repo.listPlanPurchases(),
    repo.listAuditLog(),
    repo.listPartners(),
    repo.listListings(),
  ]);
  return (
    <ReportsScreen
      reservations={reservations}
      customers={customers}
      payouts={payouts}
      purchases={purchases}
      audit={audit}
      partners={partners}
      listings={listings}
    />
  );
}
