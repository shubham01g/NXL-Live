"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { count } from "@/lib/domain/format";
import { signOut, useSession } from "@/lib/auth/use-session";
import { enterBackOffice, useStaff } from "@/lib/auth/staff-session";
import { resetDemo } from "@/lib/data/demo-store";
import { toast } from "@/components/ui/toast";
import { ButtonLink } from "@/components/ui/button";
import type { SiteStats } from "@/lib/data/repository";

/**
 * The access floater — the prototype's bottom-left "Control Panel" pill.
 *
 * One tap shows the platform pulse and lets whoever is reviewing the build
 * jump between the five role experiences. Ported from the Figma Make
 * prototype's AccessFloater.tsx with two corrections:
 *  - The prototype kept the "current role" as free-floating state, so the pill
 *    could claim "Partner" while you stood on the cars page. Here the view is
 *    derived from where you are and whether you are signed in.
 *  - Employee and Master Admin flipped a global role that every page then
 *    branched on. Here they sign into the demo staff account and open the
 *    back office at /admin, which has its own layout.
 */

type View = "user" | "member" | "partner" | "driver" | "employee" | "admin" | "master";

interface ViewOption {
  view: View;
  label: string;
  blurb: string;
  href: (signedIn: boolean) => string;
  /** Staff views sign into their demo account before navigating. */
  staffRole?: "employee" | "admin" | "master";
  badge?: string;
}

const VIEWS: ViewOption[] = [
  {
    view: "user",
    label: "User",
    blurb: "Browse, book, and manage rentals as a guest driver.",
    href: () => "/cars",
  },
  {
    view: "member",
    label: "Membership",
    blurb: "Account, loyalty points, and subscription controls.",
    href: (signedIn) => (signedIn ? "/account" : "/membership"),
  },
  {
    view: "partner",
    label: "Partner",
    blurb: "Referrals, earnings, links and payouts.",
    href: () => "/partner",
    badge: "Portal",
  },
  {
    view: "driver",
    label: "Driver",
    blurb: "Delivery jobs, routes, inspections and GPS.",
    href: () => "/driver",
    badge: "Portal",
  },
  {
    view: "employee",
    label: "Employee",
    blurb: "Manage the fleet, availability, and reservations.",
    href: () => "/admin",
    staffRole: "employee",
    badge: "Back office",
  },
  {
    view: "admin",
    label: "Admin",
    blurb: "Operations plus customers, partners and team.",
    href: () => "/admin",
    staffRole: "admin",
    badge: "Back office",
  },
  {
    view: "master",
    label: "Master Admin",
    blurb: "Full control: revenue, team, and settings.",
    href: () => "/admin",
    staffRole: "master",
    badge: "Back office",
  },
];

export function AccessFloater({ stats }: { stats: SiteStats }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const staff = useStaff();
  const signedIn = session.status === "signed-in";

  // Inside the back office the desktop sidebar owns the bottom-left corner,
  // so the floater steps right of it. The sidebar only exists once a staff
  // view has been entered; the sign-in gate is full width.
  const inBackOffice = pathname.startsWith("/admin") && staff.status === "signed-in";
  // The driver portal pins its primary action to the bottom of the screen.
  const lifted = pathname.startsWith("/driver");

  const current: View = inBackOffice
    ? staff.staff.role
    : pathname.startsWith("/partner")
      ? "partner"
      : pathname.startsWith("/driver")
        ? "driver"
        : pathname.startsWith("/account") || signedIn
          ? "member"
          : "user";
  const currentLabel = VIEWS.find((v) => v.view === current)?.label ?? "User";

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pulse = [
    { label: "Members", value: stats.memberCount },
    { label: "Partners", value: stats.partnerCount },
    { label: "Available", value: stats.availableCount },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="access-panel"
        aria-label={open ? "Close control panel" : `Open control panel — viewing as ${currentLabel}`}
        className={cn(
          // Above every menu and overlay: the floater is always reachable.
          "fixed left-5 z-[var(--z-modal)] flex h-14 items-center gap-2.5 rounded-full",
          lifted ? "bottom-28" : "bottom-5",
          inBackOffice && "lg:left-[calc(17rem+1.25rem)]",
          "border border-gold/40 bg-ink/90 px-3 text-cream shadow-elev-3 backdrop-blur sm:pr-5",
          "transition-transform duration-300 ease-editorial hover:scale-[1.03]",
        )}
      >
        <span className="metal-plate grid h-8 w-8 place-items-center rounded-full font-display text-[11px] font-bold">
          NXL
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">
            Access
          </span>
          <span className="block text-xs font-semibold leading-tight">{currentLabel}</span>
        </span>
      </button>

      {open ? (
        <div
          id="access-panel"
          role="dialog"
          aria-label="Control panel"
          className={cn(
            "fixed left-5 z-[var(--z-modal)] w-[min(92vw,340px)]",
            lifted ? "bottom-48" : "bottom-24",
            inBackOffice && "lg:left-[calc(17rem+1.25rem)]",
            "max-h-[calc(100dvh-8rem)] overflow-y-auto",
            "edge-gold animate-rise rounded-xl shadow-elev-3",
          )}
        >
          <div className="border-b border-line bg-surface-2 px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-cream">Control Panel</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close control panel"
                className="text-muted transition-colors hover:text-cream"
              >
                <X width={18} height={18} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {pulse.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-line bg-ink/50 px-2 py-2.5 text-center"
                >
                  <p className="font-display text-xl font-semibold tabular-nums text-gold">
                    {count(s.value)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-1 p-3">
            <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Switch view
            </p>
            <div className="space-y-1.5">
              {VIEWS.map((v) => {
                const href = v.href(signedIn);
                const body = (
                  <>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-cream">{v.label}</span>
                      {v.badge ? (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                          {v.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{v.blurb}</span>
                  </>
                );
                return (
                  <Link
                    key={v.view}
                    href={href}
                    onClick={() => {
                      if (v.staffRole) enterBackOffice(v.staffRole);
                      setOpen(false);
                    }}
                    aria-current={current === v.view ? "true" : undefined}
                    className={cn(
                      "block w-full rounded-lg border px-4 py-3 text-left transition-colors",
                      current === v.view
                        ? "border-gold/60 bg-surface-3"
                        : "border-line hover:border-gold/40 hover:bg-surface-2",
                    )}
                  >
                    {body}
                  </Link>
                );
              })}
            </div>

            {session.status === "signed-in" ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-ink/40 px-3 py-2.5">
                <span className="truncate text-xs text-muted">
                  Signed in · {session.member.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                    router.push("/");
                  }}
                  className="shrink-0 text-xs text-gold hover:underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <ButtonLink
                href="/membership"
                variant="outline"
                onClick={() => setOpen(false)}
                className="mt-3 w-full"
              >
                Join / Sign in
              </ButtonLink>
            )}

            <button
              type="button"
              onClick={() => {
                resetDemo();
                signOut();
                toast("Demo data reset — every portal is back to its starting state.", "warning");
                setOpen(false);
                router.push("/");
              }}
              className="mt-3 w-full text-center text-[0.6875rem] text-muted-dim transition-colors hover:text-gold"
            >
              Reset demo data
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
