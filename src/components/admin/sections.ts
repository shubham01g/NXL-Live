import {
  Activity,
  BarChart3,
  Bell,
  Car,
  CalendarCheck,
  FileSpreadsheet,
  Handshake,
  Home,
  LayoutDashboard,
  Mail,
  Megaphone,
  ScrollText,
  Search,
  Settings,
  Truck,
  UserCog,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";
import type { ComponentType } from "react";
import type { StaffRole } from "@/lib/domain/operations";

type Icon = ComponentType<{ width?: number; height?: number; className?: string }>;

/**
 * The back-office map.
 *
 * The prototype crammed eighteen tabs into one horizontal strip, filtered by
 * role. Here they are routes, grouped the way an operator thinks about the
 * business, and `minRole` carries the prototype's exact gating: employees get
 * the operational five, admins add people, master gets everything.
 */
export interface AdminSection {
  href: string;
  label: string;
  icon: Icon;
  minRole: StaffRole;
  blurb: string;
}

export interface AdminGroup {
  label: string;
  sections: AdminSection[];
}

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    label: "Operations",
    sections: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, minRole: "employee", blurb: "Today at a glance" },
      { href: "/admin/cars", label: "Cars", icon: Car, minRole: "employee", blurb: "Fleet, rates and availability" },
      { href: "/admin/homes", label: "Homes", icon: Home, minRole: "employee", blurb: "Estates, rates and availability" },
      { href: "/admin/reservations", label: "Reservations", icon: CalendarCheck, minRole: "employee", blurb: "Bookings, check-out and check-in" },
      { href: "/admin/drivers", label: "Drivers", icon: Truck, minRole: "employee", blurb: "Roster and delivery dispatch" },
    ],
  },
  {
    label: "People",
    sections: [
      { href: "/admin/customers", label: "Customers", icon: Users, minRole: "admin", blurb: "Members, tiers and wallets" },
      { href: "/admin/partners", label: "Partners", icon: Handshake, minRole: "admin", blurb: "Referral partners and codes" },
      { href: "/admin/team", label: "Team", icon: UserCog, minRole: "admin", blurb: "Staff accounts and roles" },
    ],
  },
  {
    label: "Revenue",
    sections: [
      { href: "/admin/subscriptions", label: "Subscriptions", icon: WalletCards, minRole: "master", blurb: "Drive Wallet plan sales" },
      { href: "/admin/payouts", label: "Payouts", icon: Wallet, minRole: "master", blurb: "Partner commission payouts" },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, minRole: "master", blurb: "Revenue, channels and utilisation" },
      { href: "/admin/reports", label: "Reports", icon: FileSpreadsheet, minRole: "master", blurb: "CSV exports" },
    ],
  },
  {
    label: "Growth",
    sections: [
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone, minRole: "master", blurb: "Promo codes and campaigns" },
      { href: "/admin/seo", label: "SEO", icon: Search, minRole: "master", blurb: "Titles, descriptions and indexing" },
      { href: "/admin/templates", label: "Email & SMS", icon: Mail, minRole: "master", blurb: "Message templates and merge tags" },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, minRole: "master", blurb: "Operator alerts" },
    ],
  },
  {
    label: "System",
    sections: [
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, minRole: "master", blurb: "Every change, who made it" },
      { href: "/admin/system", label: "System health", icon: Activity, minRole: "master", blurb: "Services and integrations" },
      { href: "/admin/settings", label: "Settings", icon: Settings, minRole: "master", blurb: "Platform configuration" },
    ],
  },
];

export const ADMIN_SECTIONS = ADMIN_GROUPS.flatMap((g) => g.sections);

/** The section a path belongs to — longest matching prefix wins. */
export function sectionFor(pathname: string): AdminSection | null {
  if (pathname === "/admin") return ADMIN_SECTIONS[0];
  return (
    ADMIN_SECTIONS.filter((s) => s.href !== "/admin" && pathname.startsWith(s.href)).sort(
      (a, b) => b.href.length - a.href.length,
    )[0] ?? null
  );
}
