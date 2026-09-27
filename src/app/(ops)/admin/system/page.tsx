import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { SystemScreen } from "@/components/admin/screens/system";

export const metadata: Metadata = { title: "System health" };

export default async function AdminSystemPage() {
  return <SystemScreen checks={await repo.listHealthChecks()} />;
}
