import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PartnerShell } from "@/components/partner/partner-shell";

export const metadata: Metadata = {
  title: { default: "Partner portal", template: "%s · NXL Partner portal" },
};

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>;
}
