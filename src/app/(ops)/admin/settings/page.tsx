import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { SettingsScreen } from "@/components/admin/screens/system";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  return <SettingsScreen initial={await repo.getPlatformSettings()} />;
}
