import type { Metadata } from "next";
import { DriverPortal } from "@/components/driver/driver-portal";

export const metadata: Metadata = { title: "Driver portal" };

export default function DriverPage() {
  return <DriverPortal />;
}
