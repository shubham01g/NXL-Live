import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { ListingsScreen } from "@/components/admin/screens/listings";

export const metadata: Metadata = { title: "Cars" };

export default async function AdminCarsPage() {
  return <ListingsScreen kind="car" initial={await repo.listCars()} />;
}
