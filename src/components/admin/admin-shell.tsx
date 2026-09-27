"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Lock, LogOut, Menu, ShieldCheck, UserCog } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/site/logo";
import { Avatar } from "@/components/account/avatar";
import { Button } from "@/components/ui/button";
import { Badge, Eyebrow } from "@/components/ui/primitives";
import { canAccess, STAFF_ROLE_LABEL, type StaffMember } from "@/lib/domain/operations";
import { enterBackOffice, leaveBackOffice, useStaff } from "@/lib/auth/staff-session";
import { ADMIN_GROUPS, sectionFor } from "./sections";

/**
 * The operator app.
 *
 * Its own layout rather than the marketing shell: a fixed sidebar, a slim top
 * bar, and the page. Guarding lives here for the same reason as the member
 * shell — at M2 the staff session is in the browser, so the server cannot
 * know who is asking. M3 moves this to a server-side role check.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const session = useStaff();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (session.status === "loading") {
    return (
      <div aria-hidden className="grid min-h-dvh lg:grid-cols-[17rem_1fr]">
        <div className="hidden border-r border-line bg-surface-1/60 lg:block" />
        <div className="space-y-4 p-6 lg:p-10">
          <div className="skeleton h-10 w-64 rounded-md" />
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (session.status === "signed-out") return <AccessGate />;

  const staff = session.staff;
  const section = sectionFor(pathname);
  const allowed = !section || canAccess(staff.role, section.minRole);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      {/* ------------------------------ sidebar ------------------------------ */}
      <aside className="hidden border-r border-line bg-surface-1/60 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto">
          <Sidebar staff={staff} pathname={pathname} />
        </div>
      </aside>

      {/* ------------------------------- mobile ------------------------------ */}
      {menuOpen ? (
        <div className="fixed inset-0 z-[var(--z-overlay)] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
          />
          <div
            id="admin-menu"
            role="dialog"
            aria-label="Back-office navigation"
            className="absolute inset-y-0 left-0 flex w-[min(86vw,19rem)] animate-rise flex-col overflow-y-auto border-r border-line bg-surface-1"
          >
            <Sidebar staff={staff} pathname={pathname} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        {/* ------------------------------ top bar ----------------------------- */}
        <header className="sticky top-0 z-[var(--z-header)] flex h-16 items-center gap-3 border-b border-line bg-ink/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-cream lg:hidden"
          >
            <Menu width={18} height={18} />
          </button>

          <p className="min-w-0 truncate text-sm text-muted">
            <span className="hidden sm:inline">Back office</span>
            <span className="mx-2 hidden text-muted-dim sm:inline">/</span>
            <span className="font-medium text-cream">{section?.label ?? "Back office"}</span>
          </p>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Badge tone="gold" className="hidden sm:inline-flex">
              <ShieldCheck aria-hidden width={12} height={12} />
              {STAFF_ROLE_LABEL[staff.role]}
            </Badge>
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-medium text-cream/80 transition-colors hover:border-gold/40 hover:text-gold sm:inline-flex"
            >
              View site
              <ArrowUpRight aria-hidden width={14} height={14} />
            </Link>
            <button
              type="button"
              onClick={leaveBackOffice}
              aria-label="Leave back office"
              title="Leave back office"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-gold/40 hover:text-gold"
            >
              <LogOut width={16} height={16} />
            </button>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-10 lg:pt-10">
          {allowed ? children : <Locked label={section!.label} role={staff.role} />}
        </main>
      </div>
    </div>
  );
}

/* --------------------------------- sidebar -------------------------------- */

function Sidebar({ staff, pathname }: { staff: StaffMember; pathname: string }) {
  const active = sectionFor(pathname);

  return (
    <>
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Link href="/" aria-label="NXL — public site" className="shrink-0">
          <Logo decorative className="h-10" />
        </Link>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-tight text-cream">
            {staff.role === "employee" ? "Back Office" : "Master Control"}
          </p>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
            Operator portal
          </p>
        </div>
      </div>

      <div className="mx-4 flex items-center gap-3 rounded-lg edge-gold px-3 py-3">
        <Avatar name={staff.name} photo={null} size="xs" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-cream">{staff.name}</p>
          <p className="truncate text-xs text-muted">{staff.title}</p>
        </div>
      </div>

      {/* On phones the floater sits over this drawer's bottom-left corner. */}
      <nav aria-label="Back office" className="flex flex-1 flex-col gap-6 px-3 pb-24 pt-6 lg:pb-8">
        {ADMIN_GROUPS.map((group) => {
          const visible = group.sections.filter((s) => canAccess(staff.role, s.minRole));
          if (!visible.length) return null;
          return (
            <div key={group.label}>
              <p className="px-3 pb-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-dim">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {visible.map((s) => {
                  const Icon = s.icon;
                  const current = active?.href === s.href;
                  return (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          current
                            ? "edge-gold font-medium text-cream"
                            : "border border-transparent text-cream/75 hover:bg-surface-2 hover:text-cream",
                        )}
                      >
                        <Icon
                          aria-hidden
                          width={17}
                          height={17}
                          className={cn("shrink-0", current ? "text-gold" : "text-muted")}
                        />
                        {s.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </>
  );
}

/* ------------------------------- access gate ------------------------------ */

/**
 * Shown when nobody has entered the back office. At M2 the choice is the two
 * demo staff accounts; M3 replaces this card with the real staff sign-in.
 */
function AccessGate() {
  const options = [
    {
      role: "employee" as const,
      title: "Employee",
      body: "Fleet, estates, reservations and driver dispatch — the day-to-day operation.",
    },
    {
      role: "master" as const,
      title: "Master Admin",
      body: "Everything: revenue, partners, payouts, team, marketing, SEO and settings.",
    },
  ];

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <Logo className="mx-auto h-16" />
        <Eyebrow className="mt-8 justify-center">Operator portal</Eyebrow>
        <h1 className="mt-4 font-display text-3xl font-semibold text-cream sm:text-4xl">
          Back-office access
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Choose a staff view to continue. This is the demo sign-in — real staff accounts with
          two-factor sign-in replace it when the database goes live.
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.role}
              type="button"
              onClick={() => enterBackOffice(o.role)}
              className="group rounded-xl edge-gold p-5 transition-transform duration-300 ease-editorial hover:-translate-y-0.5"
            >
              <span className="metal-plate grid h-10 w-10 place-items-center rounded-full">
                <UserCog aria-hidden width={18} height={18} />
              </span>
              <span className="mt-4 block font-display text-lg font-semibold text-cream">
                {o.title}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{o.body}</span>
              <span className="mt-4 inline-block text-sm font-semibold text-gold group-hover:underline">
                Enter as {o.title} →
              </span>
            </button>
          ))}
        </div>

        <Link href="/" className="mt-8 inline-block text-sm text-muted hover:text-gold">
          ← Back to the site
        </Link>
      </div>
    </div>
  );
}

function Locked({ label, role }: { label: string; role: StaffMember["role"] }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/40 text-gold">
        <Lock aria-hidden width={22} height={22} />
      </span>
      <h1 className="mt-6 font-display text-2xl font-semibold text-cream">
        {label} is for Master Admin
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        You are signed in as {STAFF_ROLE_LABEL[role]}. Switch to Master Admin from the access
        panel in the bottom-left corner to open this section.
      </p>
      <Button variant="outline" className="mt-6" onClick={() => enterBackOffice("master")}>
        Switch to Master Admin
      </Button>
    </div>
  );
}
