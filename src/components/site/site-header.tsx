"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SITE } from "@/lib/domain/site";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Wordmark } from "./wordmark";

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

/**
 * Account entry and notifications.
 *
 * Both controls ship with M1 so the header is complete, but everything they
 * point at — sign-in, the member dashboard, the notification feed — is M2.
 * Rather than ship a dead link or a 404, each opens a short note saying so.
 * M2 replaces the click handler with the real route and leaves the markup,
 * the placement and the styling exactly as they are.
 *
 * The bell carries no unread count. The prototype hard-coded a "1" badge with
 * nothing behind it, and a fabricated count would contradict the panel, which
 * says there is nothing to show yet.
 */
const HEADER_NOTES = {
  account: {
    title: "Member accounts",
    body: "Sign-in, your bookings, Level Rewards points and the drive credit wallet arrive with the member portal. Until then the concierge sets everything up for you.",
  },
  notifications: {
    title: "Notifications",
    body: "Nothing here yet. Booking confirmations, delivery updates and low-balance alerts land here once member accounts go live.",
  },
} as const;

type HeaderNote = keyof typeof HEADER_NOTES;

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<HeaderNote | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

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

  // Nothing closes these on navigation explicitly: every nav link already
  // calls setOpen(false), and clicking one lands in the click-away handler
  // below, which dismisses the note.

  // Escape dismisses the topmost layer.
  useEffect(() => {
    if (!open && !note) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (note) setNote(null);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, note]);

  // Click-away closes the note. Triggers are skipped so their own handler
  // still toggles it shut, rather than closing and reopening in one click.
  useEffect(() => {
    if (!note) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (noteRef.current?.contains(target)) return;
      if (target.closest("[data-note-trigger]")) return;
      setNote(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [note]);

  const toggleNote = (next: HeaderNote) =>
    setNote((current) => (current === next ? null : next));

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-header)] transition-all duration-500 ease-editorial",
        scrolled || open || note
          ? "border-b border-line bg-ink/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex items-center justify-between gap-6 py-3.5">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" aria-label={`${SITE.name} — home`} className="shrink-0">
            <Wordmark className="h-8 w-auto" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-4 xl:flex">
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

          <button
            type="button"
            data-note-trigger
            onClick={() => toggleNote("notifications")}
            aria-expanded={note === "notifications"}
            aria-label="Notifications"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-cream/80 transition-colors hover:border-gold/50 hover:text-gold"
          >
            <Bell width={16} height={16} />
          </button>

          <button
            type="button"
            data-note-trigger
            onClick={() => toggleNote("account")}
            aria-expanded={note === "account"}
            className="whitespace-nowrap text-[0.8125rem] font-medium text-cream/80 transition-colors hover:text-gold"
          >
            Join / Sign in
          </button>

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
                <Button
                  variant="subtle"
                  className="flex-1"
                  onClick={() => {
                    setOpen(false);
                    setNote("account");
                  }}
                >
                  Join / Sign in
                </Button>
                <Button
                  variant="subtle"
                  aria-label="Notifications"
                  className="shrink-0 px-4"
                  onClick={() => {
                    setOpen(false);
                    setNote("notifications");
                  }}
                >
                  <Bell aria-hidden width={16} height={16} />
                </Button>
              </div>

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

      {note ? (
        <div
          ref={noteRef}
          role="dialog"
          aria-label={HEADER_NOTES[note].title}
          className="absolute right-4 top-full z-[var(--z-float)] mt-2 w-[min(92vw,21rem)] animate-rise sm:right-6 lg:right-8"
        >
          <div className="edge-gold rounded-lg p-5 shadow-elev-3">
            <div className="flex items-start justify-between gap-4">
              <p className="font-display text-base font-semibold text-cream">
                {HEADER_NOTES[note].title}
              </p>
              <button
                type="button"
                onClick={() => setNote(null)}
                aria-label="Close"
                className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-gold"
              >
                <X width={14} height={14} />
              </button>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              {HEADER_NOTES[note].body}
            </p>

            <ButtonLink
              href="/contact"
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setNote(null)}
            >
              Talk to the concierge
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}
