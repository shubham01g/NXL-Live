import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { ListingsScreen } from "@/components/admin/screens/listings";

export const metadata: Metadata = { title: "Homes" };

export default async function AdminHomesPage() {
  return <ListingsScreen kind="home" initial={await repo.listHomes()} />;
}
