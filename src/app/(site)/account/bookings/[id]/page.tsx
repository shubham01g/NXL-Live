import type { Metadata } from "next";
import { BookingDetail } from "@/components/account/sections/booking-detail";

export const metadata: Metadata = { title: "Booking" };

export default async function AccountBookingPage({ params }: PageProps<"/account/bookings/[id]">) {
  const { id } = await params;
  return <BookingDetail id={id} />;
}
