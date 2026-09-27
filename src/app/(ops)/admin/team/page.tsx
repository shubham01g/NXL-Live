import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { TeamScreen } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Team" };

export default async function AdminTeamPage() {
  return <TeamScreen initial={await repo.listStaff()} />;
}
