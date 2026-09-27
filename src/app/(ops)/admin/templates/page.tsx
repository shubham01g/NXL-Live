import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { TemplatesScreen } from "@/components/admin/screens/growth";

export const metadata: Metadata = { title: "Email & SMS" };

export default async function AdminTemplatesPage() {
  return <TemplatesScreen initial={await repo.listTemplates()} />;
}
