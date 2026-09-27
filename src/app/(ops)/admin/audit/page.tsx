import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { AuditScreen } from "@/components/admin/screens/system";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  return <AuditScreen entries={await repo.listAuditLog()} />;
}
