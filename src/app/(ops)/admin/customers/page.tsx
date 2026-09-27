import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { CustomersScreen } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  return <CustomersScreen initial={await repo.listCustomers()} />;
}
