import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { SeoScreen } from "@/components/admin/screens/growth";

export const metadata: Metadata = { title: "SEO" };

export default async function AdminSeoPage() {
  return <SeoScreen initial={await repo.listSeoPages()} />;
}
