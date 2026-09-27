import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { PartnersScreen } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Partners" };

export default async function AdminPartnersPage() {
  return <PartnersScreen initial={await repo.listPartners()} />;
}
