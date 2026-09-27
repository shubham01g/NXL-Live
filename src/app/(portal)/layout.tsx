import type { ReactNode } from "react";
import type { Metadata } from "next";

/**
 * Partner and driver portals. Their own shells, outside the marketing site;
 * personal and session-gated, so never indexed.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
