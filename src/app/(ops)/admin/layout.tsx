import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * The operator app: Employee back office and Master Admin console.
 *
 * Deliberately outside the (site) group — no marketing header or footer.
 * The access floater still shows here; the root layout mounts it.
 */
// Operator data is live by nature, and the demo fixtures are dated relative
// to "now" — prerendering would freeze today's schedule at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Back office", template: "%s · NXL Back office" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
