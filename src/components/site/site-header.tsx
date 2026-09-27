"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SITE } from "@/lib/domain/site";
import { tierFor } from "@/lib/domain/loyalty";
import type { Listing } from "@/lib/domain/types";
import { useSession } from "@/lib/auth/use-session";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { TierChip } from "@/components/account/tier-chip";
import { Logo } from "./logo";
import { NotificationPanel, useFeed } from "./notification-center";
import { QuickReserve } from "./quick-reserve";

/**
 * Primary navigation.
 *
 * Labels are deliberately shortened from the prototype ("Loyalty Program" →
 * "Loyalty") so all eight links fit on one row alongside the account controls.
 *
 * The full row needs `xl`: eight links plus the bell, the account entry and
 * Reserve overflow at 1024px. Below `xl` the drawer takes over, so there is
 * never a width with no navigation — which was the actual bug in the
 * prototype, where the nav vanished under 1280px with nothing in its place.
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

export function SiteHeader({ listings }: { listings: Listing[] }) {
  const pathname = usePathname();
  const session = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const member = session.status === "signed-in" ? session.member : null;

  /**
   * The badge counts unread items in the same feed the panel renders — account
   * tasks plus booking notices. A signed-out visitor has nothing to be
   * notified about, so no badge, rather than the prototype's hard-coded "1".
   */
  const feed = useFeed(member);
  const notifications = feed.filter((i) => !i.read);

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

  // Escape dismisses the topmost layer.
  useEffect(() => {
    if (!open && !bellOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (bellOpen) setBellOpen(false);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, bellOpen]);

  // Click-away closes the bell. The trigger is skipped so its own handler
  // still toggles it shut, rather than closing and reopening in one click.
  useEffect(() => {
    if (!bellOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (bellRef.current?.contains(target)) return;
      if (target.closest("[data-bell-trigger]")) return;
      setBellOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [bellOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-header)] transition-all duration-500 ease-editorial",
        scrolled || open || bellOpen
          ? "border-b border-line bg-ink/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex items-center justify-between gap-6 py-2">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" aria-label={`${SITE.name} — home`} className="shrink-0">
            <Logo decorative priority className="h-12 w-auto sm:h-16" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-4 xl:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "gold-underline whitespace-nowrap pb-0.5 text-[0.8125rem] font-medium transition-colors 2xl:text-sm",
                  isActive(item.href) ? "text-gold" : "text-cream/75 hover:text-cream",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden shrink-0 items-center gap-3 xl:flex">
          {/* The phone number is the first thing to go when the row tightens.
              It only earns its ~160px once the container stops growing, so it
              appears at 2xl; below that it lives in the drawer and the footer. */}
          <a
            href={SITE.contact.phoneHref}
            className="hidden items-center gap-2 text-[0.8125rem] text-cream/70 transition-colors hover:text-gold 2xl:flex"
          >
            <Phone aria-hidden width={14} height={14} />
            <span className="font-mono tabular-nums">{SITE.contact.phone}</span>
          </a>

          <BellButton
            count={notifications.length}
            open={bellOpen}
            onToggle={() => setBellOpen((v) => !v)}
          />

          {member ? (
            <Link
              href="/account"
              aria-label={`Your account — ${member.name}`}
              className="transition-opacity hover:opacity-80"
            >
              <TierChip tier={tierFor(member.points)} points={member.points} />
            </Link>
          ) : (
            <Link
              href="/membership"
              className="whitespace-nowrap text-[0.8125rem] font-medium text-cream/80 transition-colors hover:text-gold"
            >
              Join / Sign in
            </Link>
          )}

          <Button size="sm" className="px-5 py-2.5" onClick={() => setReserveOpen(true)}>
            Reserve
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-cream transition-colors hover:border-gold/50 hover:text-gold xl:hidden"
        >
          {open ? <X width={18} height={18} /> : <Menu width={18} height={18} />}
        </button>
      </Container>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-line bg-ink/95 backdrop-blur-xl xl:hidden"
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
              <div className="flex gap-3">
                {member ? (
                  <ButtonLink
                    href="/account"
                    variant="subtle"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Your account
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    href="/membership"
                    variant="subtle"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Join / Sign in
                  </ButtonLink>
                )}

                <Button
                  variant="subtle"
                  aria-label={
                    notifications.length > 0
                      ? `Notifications, ${notifications.length} waiting`
                      : "Notifications"
                  }
                  className="relative shrink-0 px-4"
                  onClick={() => {
                    setOpen(false);
                    setBellOpen(true);
                  }}
                >
                  <Bell aria-hidden width={16} height={16} />
                  {notifications.length > 0 ? (
                    <span
                      aria-hidden
                      className="metal-plate absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[0.5625rem] tabular-nums"
                    >
                      {notifications.length}
                    </span>
                  ) : null}
                </Button>
              </div>

              <Button
                onClick={() => {
                  setOpen(false);
                  setReserveOpen(true);
                }}
                className="w-full"
              >
                Reserve
              </Button>

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

      {bellOpen ? (
        <div
          ref={bellRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-4 top-full z-[var(--z-float)] mt-2 w-[min(92vw,22rem)] animate-rise sm:right-6 lg:right-8"
        >
          <NotificationPanel member={member} onClose={() => setBellOpen(false)} />
        </div>
      ) : null}

      <QuickReserve listings={listings} open={reserveOpen} onClose={() => setReserveOpen(false)} />
    </header>
  );
}

function BellButton({
  count,
  open,
  onToggle,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-bell-trigger
      onClick={onToggle}
      aria-expanded={open}
      aria-label={count > 0 ? `Notifications, ${count} waiting` : "Notifications"}
      className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-cream/80 transition-colors hover:border-gold/50 hover:text-gold"
    >
      <Bell width={16} height={16} />
      {count > 0 ? (
        <span
          aria-hidden
          className="metal-plate absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[0.5625rem] font-semibold tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
