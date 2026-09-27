import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { NotificationsScreen } from "@/components/admin/screens/growth";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const [initial, customers] = await Promise.all([repo.listAlerts(), repo.listCustomers()]);
  return <NotificationsScreen initial={initial} customers={customers} />;
}
