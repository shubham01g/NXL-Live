"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { useMember } from "@/lib/auth/use-session";
import { setValue, useDemoValue } from "@/lib/data/demo-store";
import { filterFeed, FeedRow, markAllRead, useFeed, type FeedFilter } from "@/components/site/notification-center";
import { DEFAULT_PREFS, enablePush, prefsKey, type NotificationPrefs } from "@/components/site/push-banner";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { Panel, SectionHeader } from "../panel";

/**
 * The notification centre: the full feed plus delivery preferences. The
 * prototype's NotificationCenter kept these in a header dropdown; the
 * dropdown stays as a preview and this page holds the whole history.
 */

const PREF_ROWS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "push", label: "Push notifications", hint: "On this device — delivery updates and reminders." },
  { key: "email", label: "Email", hint: "Confirmations, receipts and statements." },
  { key: "sms", label: "SMS", hint: "Driver on the way, and one-time codes." },
  { key: "reminders", label: "Trip reminders", hint: "24 hours and 2 hours before pickup and return." },
  { key: "marketing", label: "Offers & new arrivals", hint: "Members-only pricing and first access. A few a month." },
];

export function NotificationsSection() {
  const member = useMember();
  const feed = useFeed(member);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const prefs = useDemoValue<NotificationPrefs>(prefsKey(member?.email ?? "-"), DEFAULT_PREFS);
  if (!member) return null;

  const unread = feed.filter((i) => !i.read).length;
  const shown = filterFeed(feed, filter);
  const setPref = (key: keyof NotificationPrefs, on: boolean) => {
    if (key === "push" && on) {
      void enablePush(member.email, prefs);
      return;
    }
    setValue(prefsKey(member.email), { ...prefs, [key]: on });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notifications"
        description="Booking confirmations, delivery updates, reminders and account tasks."
        action={
          <Button size="sm" variant="outline" disabled={!unread} onClick={() => markAllRead(feed)}>
            Mark all read
          </Button>
        }
      />

      <Panel>
        <Tabs<FeedFilter>
          label="Filter notifications"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "All", count: feed.length },
            { value: "unread", label: "Unread", count: unread },
            { value: "bookings", label: "Bookings" },
            { value: "system", label: "Account & offers" },
          ]}
        />
        {shown.length ? (
          <ul className="mt-2 divide-y divide-line">
            {shown.map((item) => (
              <li key={item.id}>
                <FeedRow item={item} large />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState className="mt-6" title="All caught up" description="New notifications will appear here." />
        )}
      </Panel>

      <Panel title="Preferences" description="Choose how we reach you. Email and SMS sending goes live at launch; push works now in supported browsers.">
        <ul className="divide-y divide-line">
          {PREF_ROWS.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm text-cream">
                  {row.key === "push" ? <BellRing aria-hidden width={14} height={14} className="text-gold" /> : null}
                  {row.label}
                </p>
                <p className="text-xs text-muted-dim">{row.hint}</p>
              </div>
              <Toggle label={row.label} checked={prefs[row.key]} onChange={(on) => setPref(row.key, on)} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
