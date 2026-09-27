import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { NotificationsScreen } from "@/components/admin/screens/growth";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  return <NotificationsScreen initial={await repo.listAlerts()} />;
}
