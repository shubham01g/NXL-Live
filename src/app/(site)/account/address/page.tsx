import type { Metadata } from "next";
import { AddressSection } from "@/components/account/sections/address-section";

export const metadata: Metadata = { title: "Address" };

export default function AccountAddressPage() {
  return <AddressSection />;
}
