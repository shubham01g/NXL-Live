"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CalendarCheck, CarFront, Gift, Info, KeyRound, Settings2, TriangleAlert } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/domain/format";
import { notificationsFor } from "@/lib/domain/account";
import type { MemberAccount } from "@/lib/domain/types";
import type { MemberNotice, NotificationKind } from "@/lib/domain/operations";
import { demoNotices } from "@/lib/data/fixtures/member";
import { C } from "@/lib/data/demo";
import { patch, useCollection } from "@/lib/data/demo-store";
import { ButtonLink } from "@/components/ui/button";
import { useClock } from "@/lib/hooks/use-clock";

/**
 * The member notification feed.
 *
 * Two sources, one list:
 *  - Account tasks derived from the member record (add a card, low wallet).
 *    These cannot be "read" away — they clear when the thing is done.
 *  - Stored notices: booking confirmations, the reminder schedule written at
 *    checkout, driver updates and broadcasts from the back office. Future
 *    reminders stay hidden until their time arrives.
 */

const SEED = typeof window === "undefined" ? [] : demoNotices();

export type FeedFilter = "all" | "unread" | "bookings" | "system";

export interface FeedItem {
  id: string;
  title: string;
  body: string;
  at: number | null;
  href?: string;
  kind: NotificationKind | "task";
  read: boolean;
  tone: "warning" | "info" | "gold";
  media?: MemberNotice["media"];
  notice?: MemberNotice;
}

const BOOKING_KINDS: FeedItem["kind"][] = ["confirmation", "reminder", "pickup", "return"];

export function useFeed(member: MemberAccount | null) {
  const notices = useCollection<MemberNotice>(C.notices, SEED);
  // Ticks each minute so a scheduled reminder appears the moment it falls due.
  const now = useClock(60_000);
  return useMemo(() => {
    if (!member) return [] as FeedItem[];
    const tasks: FeedItem[] = notificationsFor(member).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      href: n.href,
      at: null,
      kind: "task",
      read: false,
      tone: n.tone,
    }));
    const stored: FeedItem[] = notices
      .filter((n) => n.email === member.email && n.at <= now)
      .sort((a, b) => b.at - a.at)
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        at: n.at,
        kind: n.kind,
        read: n.read,
        tone: n.kind === "promo" ? "gold" : "info",
        media: n.media,
        notice: n,
      }));
    return [...tasks, ...stored];
  }, [member, notices, now]);
}

export function filterFeed(items: FeedItem[], filter: FeedFilter) {
  switch (filter) {
    case "unread":
      return items.filter((i) => !i.read);
    case "bookings":
      return items.filter((i) => BOOKING_KINDS.includes(i.kind));
    case "system":
      return items.filter((i) => !BOOKING_KINDS.includes(i.kind));
    default:
      return items;
  }
}

export function markRead(item: FeedItem) {
  if (item.notice && !item.notice.read) patch<MemberNotice>(C.notices, item.notice, { read: true });
}

export function markAllRead(items: FeedItem[]) {
  for (const i of items) markRead(i);
}

const ICONS: Record<FeedItem["kind"], ComponentType<{ width?: number; height?: number; className?: string }>> = {
  task: TriangleAlert,
  confirmation: CalendarCheck,
  reminder: Bell,
  pickup: KeyRound,
  return: CarFront,
  update: Info,
  system: Settings2,
  promo: Gift,
};

export function FeedRow({ item, onNavigate, large = false }: { item: FeedItem; onNavigate?: () => void; large?: boolean }) {
  const Icon = ICONS[item.kind];
  const body = (
    <span className="flex gap-3">
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full border",
          item.tone === "warning" ? "border-warning/40 text-warning" : item.tone === "gold" ? "border-gold/40 text-gold" : "border-line text-info",
        )}
      >
        <Icon aria-hidden width={14} height={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={cn("text-sm text-cream", !item.read && "font-semibold")}>{item.title}</span>
          <span className="flex shrink-0 items-center gap-2 text-[0.6875rem] text-muted-dim">
            {item.at ? relativeTime(item.at) : "To do"}
            {!item.read ? <span aria-label="Unread" role="img" className="h-1.5 w-1.5 rounded-full bg-gold" /> : null}
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{item.body}</span>
        {item.media && large ? (
          item.media.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.media.url} alt="" className="mt-3 max-h-56 w-full rounded-lg object-cover" />
          ) : (
            <video src={item.media.url} controls className="mt-3 max-h-56 w-full rounded-lg" />
          )
        ) : null}
      </span>
    </span>
  );

  return item.href ? (
    <Link
      href={item.href}
      onClick={() => {
        markRead(item);
        onNavigate?.();
      }}
      className="block rounded-lg px-2 py-3 transition-colors hover:bg-surface-2/60"
    >
      {body}
    </Link>
  ) : (
    <button type="button" onClick={() => markRead(item)} className="block w-full rounded-lg px-2 py-3 text-left hover:bg-surface-2/60">
      {body}
    </button>
  );
}

/** The header dropdown. */
export function NotificationPanel({ member, onClose }: { member: MemberAccount | null; onClose: () => void }) {
  const feed = useFeed(member);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const shown = filterFeed(feed, filter).slice(0, 8);
  const unread = feed.filter((i) => !i.read).length;

  if (!member) {
    return (
      <div className="edge-gold rounded-lg p-5 shadow-elev-3">
        <p className="font-display text-base font-semibold text-cream">Notifications</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Booking confirmations, delivery updates and low-balance alerts appear here once you have an account.
        </p>
        <ButtonLink href="/membership" variant="outline" size="sm" className="mt-4 w-full" onClick={onClose}>
          Join / Sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="edge-gold rounded-lg shadow-elev-3">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="font-display text-base font-semibold text-cream">
          Notifications {unread ? <span className="ml-1 font-mono text-xs text-gold">{unread} new</span> : null}
        </p>
        <button type="button" onClick={() => markAllRead(feed)} className="text-xs text-gold hover:underline disabled:opacity-40" disabled={!unread}>
          Mark all read
        </button>
      </div>
      <div className="flex gap-1 border-b border-line px-3 py-2">
        {(["all", "unread", "bookings", "system"] as FeedFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs capitalize transition-colors",
              filter === f ? "bg-gold/15 text-gold" : "text-muted hover:text-cream",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="max-h-[min(60vh,26rem)] overflow-y-auto px-2 py-1">
        {shown.length ? (
          <ul className="divide-y divide-line">
            {shown.map((item) => (
              <li key={item.id}>
                <FeedRow item={item} onNavigate={onClose} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-8 text-center text-sm text-muted">Nothing here — you&apos;re all caught up.</p>
        )}
      </div>
      <div className="border-t border-line px-4 py-3 text-center">
        <Link href="/account/notifications" onClick={onClose} className="text-xs font-semibold text-gold hover:underline">
          Open notification centre →
        </Link>
      </div>
    </div>
  );
}
