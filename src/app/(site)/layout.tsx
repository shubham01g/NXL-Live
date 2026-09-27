import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ConciergeWidget } from "@/components/site/concierge/concierge-widget";
import { PushBanner } from "@/components/site/push-banner";
import { repo } from "@/lib/data";

/**
 * Public marketing shell. Everything a guest sees lives under this layout.
 * The partner, driver and admin portals have their own shells.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const listings = await repo.listListings();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:metal-plate focus:rounded-full focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      <SiteHeader listings={listings} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <ConciergeWidget />
      <PushBanner />
    </>
  );
}
