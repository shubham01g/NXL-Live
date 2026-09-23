"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car,
  CreditCard,
  Home,
  KeyRound,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { cardLabel, setupTasks, isLowBalance } from "@/lib/domain/account";
import type { MemberAccount } from "@/lib/domain/types";
import { Avatar } from "./avatar";
import { TierChip } from "./tier-chip";
import { tierFor } from "@/lib/domain/loyalty";

type Icon = ComponentType<{ width?: number; height?: number; className?: string }>;

/**
 * Account sidebar.
 *
 * Each row carries its own current state as a subtitle — "$0 remaining",
 * "Card on file" — because the whole point of this nav is telling the member
 * which parts of their account still need attention. The dot is the same
 * signal the header bell counts, derived from the same `setupTasks`.
 */
interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  subtitle: string;
  /** Warning dot: something here is incomplete. */
  flag: "required" | "recommended" | null;
}

function items(member: MemberAccount): NavItem[] {
  const tasks = setupTasks(member);
  const flagFor = (id: "card" | "insurance" | "address" | "mfa") =>
    tasks.find((t) => t.id === id)?.severity ?? null;

  return [
    {
      href: "/account",
      label: "Overview",
      icon: LayoutDashboard,
      subtitle: "Points, tier, & rentals",
      flag: null,
    },
    {
      href: "/account/wallet",
      label: "Drive Wallet",
      icon: Wallet,
      subtitle: `${money(member.credits)} remaining`,
      flag: isLowBalance(member) ? "required" : null,
    },
    {
      href: "/account/payment",
      label: "Payment",
      icon: CreditCard,
      subtitle: member.card ? cardLabel(member.card) : "No card on file",
      flag: flagFor("card"),
    },
    {
      href: "/account/insurance",
      label: "Insurance",
      icon: ShieldCheck,
      subtitle: member.insurance
        ? member.insurance.kind === "nxl"
          ? "NXL daily package"
          : (member.insurance.carrier ?? "Own policy")
        : "Coverage for rentals",
      flag: flagFor("insurance"),
    },
    {
      href: "/account/address",
      label: "Address",
      icon: MapPin,
      subtitle: member.address ? member.address.city : "Billing & delivery",
      flag: flagFor("address"),
    },
    {
      href: "/account/security",
      label: "Security",
      icon: KeyRound,
      subtitle: "Password, MFA & OTP",
      flag: flagFor("mfa"),
    },
  ];
}

const ELSEWHERE: { href: string; label: string; icon: Icon }[] = [
  { href: "/account/rewards", label: "Level Rewards", icon: Star },
  { href: "/cars", label: "Browse cars", icon: Car },
  { href: "/homes", label: "Browse homes", icon: Home },
];

export function AccountNav({ member }: { member: MemberAccount }) {
  const pathname = usePathname();
  const tier = tierFor(member.points);

  return (
    <nav aria-label="Account" className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-1/60 p-3">
        <Avatar name={member.name} photo={member.photo} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-cream">{member.name}</p>
          <TierChip tier={tier} className="mt-1 border-0 bg-transparent px-0 py-0" />
        </div>
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {items(member).map((item) => {
          const Icon = item.icon;
          // Overview owns /account exactly; the rest own their subtree.
          const active =
            item.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  active
                    ? "edge-gold"
                    : "border border-transparent hover:bg-surface-1/70",
                )}
              >
                <Icon
                  aria-hidden
                  width={16}
                  height={16}
                  className={cn("mt-0.5 shrink-0", active ? "text-gold" : "text-muted")}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      active ? "text-cream" : "text-cream/85",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-muted-dim">
                    {item.subtitle}
                  </span>
                </span>
                {item.flag ? (
                  <span
                    aria-label={
                      item.flag === "required" ? "Action required" : "Recommended"
                    }
                    role="img"
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      item.flag === "required" ? "bg-danger" : "bg-warning",
                    )}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <hr className="rule-gold my-3" />

      <ul className="flex flex-col gap-1">
        {ELSEWHERE.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "text-gold" : "text-cream/75 hover:text-gold",
                )}
              >
                <Icon aria-hidden width={15} height={15} className="shrink-0 text-gold" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Mobile variant.
 *
 * The vertical rail is nine rows deep, which would push the panel below the
 * fold on a phone. Same items and the same flags, laid out as a horizontal
 * scroller so the section content stays where the member is looking.
 */
export function AccountNavCompact({ member }: { member: MemberAccount }) {
  const pathname = usePathname();
  const rows = items(member);

  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex w-max gap-2">
        {rows.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors",
                  active
                    ? "metal-plate font-medium"
                    : "border border-line text-cream/80 hover:border-line-strong",
                )}
              >
                <Icon aria-hidden width={14} height={14} className="shrink-0" />
                {item.label}
                {item.flag ? (
                  <span
                    aria-label={
                      item.flag === "required" ? "Action required" : "Recommended"
                    }
                    role="img"
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      item.flag === "required" ? "bg-danger" : "bg-warning",
                    )}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}

        {ELSEWHERE.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm text-cream/80 transition-colors hover:border-line-strong"
              >
                <Icon aria-hidden width={14} height={14} className="shrink-0 text-gold" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
