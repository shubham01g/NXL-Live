import type { Metadata } from "next";
import { NotificationsSection } from "@/components/account/sections/notifications-section";

export const metadata: Metadata = { title: "Notifications" };

export default function AccountNotificationsPage() {
  return <NotificationsSection />;
}
