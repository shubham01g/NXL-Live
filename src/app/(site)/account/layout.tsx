import type { ReactNode } from "react";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { AccountShell } from "@/components/account/account-shell";

/**
 * Member area.
 *
 * Kept inside the public shell on purpose: the client's design puts the same
 * header and footer around the dashboard, and a member moving between the
 * fleet and their account should not feel two different sites.
 *
 * Plans are fetched here rather than in each section so the profile card and
 * the wallet panel read the same list.
 */
export const metadata: Metadata = {
  // Personal, and gated behind a session — never index it.
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const plans = await repo.listPlans();
  return <AccountShell plans={plans}>{children}</AccountShell>;
}
