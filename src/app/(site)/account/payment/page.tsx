import type { Metadata } from "next";
import { PaymentSection } from "@/components/account/sections/payment-section";

export const metadata: Metadata = { title: "Payment" };

export default function AccountPaymentPage() {
  return <PaymentSection />;
}
