"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SITE } from "@/lib/domain/site";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Wordmark } from "./wordmark";

/**
 * Primary navigation.
 *
 * Labels are deliberately shortened from the prototype ("Loyalty Program" →
 * "Loyalty") so all eight links fit from the `lg` breakpoint up. The prototype
 * only rendered its nav at `xl`, which left a dead zone between 1024px and
 * 1280px where the site had no navigation at all.
 *
 * "Home" is not a link — the wordmark is.
 */
const NAV = [
  { href: "/cars", label: "Exotic Cars" },
  { href: "/homes", label: "Luxury Homes" },
  { href: "/subscriptions", label: "Subscription" },
  { href: "/loyalty", label: "Loyalty" },
  { href: "/partners", label: "Partners" },
  { href: "/about", label: "About" },
  { href: "/who-we-are", label: "Who We Are" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock scroll behind the mobile drawer.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-header)] transition-all duration-500 ease-editorial",
        scrolled || open
          ? "border-b border-line bg-ink/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex items-center justify-between gap-6 py-3.5">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" aria-label={`${SITE.name} — home`} className="shrink-0">
            <Wordmark className="h-8 w-auto" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "gold-underline whitespace-nowrap pb-0.5 text-[0.8125rem] font-medium transition-colors",
                  isActive(item.href) ? "text-gold" : "text-cream/75 hover:text-cream",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          <a
            href={SITE.contact.phoneHref}
            className="flex items-center gap-2 text-[0.8125rem] text-cream/70 transition-colors hover:text-gold"
          >
            <Phone aria-hidden width={14} height={14} />
            <span className="font-mono tabular-nums">{SITE.contact.phone}</span>
          </a>
          {/* Account entry arrives with M2, when the member dashboard exists. */}
          <ButtonLink href="/cars" size="sm" className="px-5 py-2.5">
            Reserve
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-cream transition-colors hover:border-gold/50 hover:text-gold lg:hidden"
        >
          {open ? <X width={18} height={18} /> : <Menu width={18} height={18} />}
        </button>
      </Container>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-line bg-ink/95 backdrop-blur-xl lg:hidden"
        >
          <Container>
            <nav aria-label="Mobile" className="flex flex-col py-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between border-b border-line/60 py-4 text-base transition-colors",
                    isActive(item.href) ? "text-gold" : "text-cream/90 hover:text-gold",
                  )}
                >
                  {item.label}
                  <span aria-hidden className="text-gold">
                    →
                  </span>
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-3 py-5">
              <ButtonLink href="/cars" onClick={() => setOpen(false)} className="w-full">
                Reserve a car
              </ButtonLink>
              <a
                href={SITE.contact.phoneHref}
                className="flex items-center justify-center gap-2 py-2 text-sm text-cream/70"
              >
                <Phone aria-hidden width={14} height={14} />
                {SITE.contact.phone}
              </a>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
