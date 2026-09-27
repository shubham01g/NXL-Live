import type { Metadata } from "next";
import { BookingsSection } from "@/components/account/sections/bookings-section";

export const metadata: Metadata = { title: "Bookings" };

export default function AccountBookingsPage() {
  return <BookingsSection />;
}
