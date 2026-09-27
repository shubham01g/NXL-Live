"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, LocateFixed, MessageCircle, Phone, RotateCcw, Star, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { unitLabel } from "@/lib/domain/pricing";
import type { Driver, Reservation } from "@/lib/domain/operations";
import type { Review } from "@/lib/domain/types";
import { useMember } from "@/lib/auth/use-session";
import { cancelBooking, canCancel, FREE_CANCEL_MS, listingFor, reportRenterPosition, useMemberBookings } from "@/lib/data/member-bookings";
import { C, useDrivers } from "@/lib/data/demo";
import { create, newId, useCollection } from "@/lib/data/demo-store";
import { useClock } from "@/lib/hooks/use-clock";
import { LiveRentalMap } from "@/components/maps/live-rental-map";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/field";
import { Media } from "@/components/ui/media";
import { Modal } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { Status } from "@/components/admin/status";
import { DetailRow, Panel } from "../panel";

/**
 * One booking, as the member sees it.
 *
 * The timeline reads the same fields the back office and the driver portal
 * write — so when dispatch assigns a driver, or the driver marks the car
 * delivered, the member sees it here without anyone telling them.
 */

const when = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ms));

interface Step {
  label: string;
  detail?: string;
  done: boolean;
}

function timeline(r: Reservation, driver: Driver | null): Step[] {
  const cancelled = r.status === "cancelled";
  const out = r.status === "checked_out" || r.status === "active" || r.status === "completed";
  const back = r.status === "completed";
  if (r.listingKind === "home") {
    return [
      { label: "Booked", detail: when(r.createdAt), done: true },
      { label: "Confirmed", detail: "Estate prepared for your arrival", done: r.status !== "pending" && !cancelled },
      { label: "Checked in", detail: when(r.window.start), done: out },
      { label: "Checked out", detail: when(r.window.end), done: back },
    ];
  }
  const delivered = r.driverJob === "delivered" || out;
  if (r.deliveryAddress) {
    return [
      { label: "Booked", detail: when(r.createdAt), done: true },
      { label: "Driver assigned", detail: driver ? driver.name : "Dispatch assigns a driver before pickup", done: !!r.driverId && !cancelled },
      { label: "On the way", detail: r.driverJob === "en_route" ? "Collecting the car from the depot" : r.driverJob === "picked_up" ? "Car collected — heading to you" : "Your driver sets off before handover", done: r.driverJob === "en_route" || r.driverJob === "picked_up" || delivered },
      { label: "Delivered", detail: r.deliveryAddress, done: delivered },
      { label: "Returned", detail: when(r.window.end), done: back },
    ];
  }
  return [
    { label: "Booked", detail: when(r.createdAt), done: true },
    { label: "Ready at the depot", detail: "1200 Ocean Drive, Miami Beach", done: r.status !== "pending" && !cancelled },
    { label: "Picked up", detail: when(r.window.start), done: out },
    { label: "Returned", detail: when(r.window.end), done: back },
  ];
}

export function BookingDetail({ id }: { id: string }) {
  const member = useMember();
  const bookings = useMemberBookings(member);
  const drivers = useDrivers();
  const reviews = useCollection<Review>(C.reviews, []);
  const now = useClock(30_000);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (!member) return null;
  const r = bookings.find((b) => b.id === id);
  if (!r) {
    return (
      <EmptyState
        title="Booking not found"
        description="It may belong to another account, or the link is out of date."
        action={<ButtonLink href="/account/bookings">All bookings</ButtonLink>}
      />
    );
  }

  const listing = listingFor(r.listingId);
  const driver = drivers.find((d) => d.id === r.driverId) ?? null;
  const steps = timeline(r, driver);
  const live = r.status === "checked_out" || r.status === "active";
  const reviewed = reviews.some((x) => x.listingId === r.listingId && x.authorName === member.name);
  const late = r.window.start - now < FREE_CANCEL_MS;

  return (
    <div className="space-y-6">
      <Link href="/account/bookings" className="inline-flex items-center gap-2 text-sm text-muted hover:text-gold">
        <ArrowLeft aria-hidden width={14} height={14} />
        All bookings
      </Link>

      <div className="grid gap-5 overflow-hidden rounded-xl edge-gold sm:grid-cols-[14rem_1fr]">
        <Media src={listing?.photo} alt={r.listingName} aspect="4/3" rounded={false} className="h-full" sizes="240px" />
        <div className="p-5 sm:py-6 sm:pr-6">
          <div className="flex flex-wrap items-center gap-2">
            <Status kind="booking" value={r.status} />
            <span className="font-mono text-xs text-muted">{r.reference}</span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-semibold text-cream">{r.listingName}</h2>
          <p className="mt-1 text-sm text-muted">
            {when(r.window.start)} → {when(r.window.end)} · {unitLabel(r.unit, r.qty)}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {listing ? (
              <ButtonLink href={`/checkout?listing=${listing.slug}&unit=${r.unit}&qty=${r.qty}`} size="sm" variant="outline">
                <RotateCcw aria-hidden width={14} height={14} /> Book again
              </ButtonLink>
            ) : null}
            <ButtonLink href={`/contact?listing=${listing?.slug ?? ""}`} size="sm" variant="subtle">
              <MessageCircle aria-hidden width={14} height={14} /> Concierge
            </ButtonLink>
            {canCancel(r, now) ? (
              <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmCancel(true)}>
                <XCircle aria-hidden width={14} height={14} /> Cancel
              </Button>
            ) : null}
            {r.status === "completed" && !reviewed ? (
              <Button size="sm" onClick={() => setReviewOpen(true)}>
                <Star aria-hidden width={14} height={14} /> Leave a review
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {r.status === "cancelled" ? (
        <Alert tone="danger" title="Cancelled">
          This booking was cancelled. Any Drive Wallet credit used was returned to your wallet.
        </Alert>
      ) : (
        <Panel title="Status">
          <ol className="relative space-y-5">
            {steps.map((s, i) => {
              const current = s.done && !steps[i + 1]?.done;
              return (
                <li key={s.label} className="relative flex gap-4">
                  {i < steps.length - 1 ? (
                    <span aria-hidden className={cn("absolute left-[0.8125rem] top-7 h-[calc(100%-0.5rem)] w-px", steps[i + 1].done ? "metal-track" : "bg-line")} />
                  ) : null}
                  <span
                    className={cn(
                      "relative grid h-7 w-7 shrink-0 place-items-center rounded-full",
                      s.done ? "metal-plate" : "border border-line text-muted",
                      current && "shadow-glow-gold",
                    )}
                  >
                    {s.done ? <Check aria-hidden width={13} height={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className={cn("text-sm", s.done ? "font-medium text-cream" : "text-muted")}>
                      {s.label}
                      {current && live ? <span className="ml-2 font-mono text-[0.625rem] uppercase tracking-widest text-success">Now</span> : null}
                    </p>
                    {s.detail ? <p className="text-xs text-muted-dim">{s.detail}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}

      {r.listingKind === "car" && r.status !== "cancelled" && r.status !== "completed" ? (
        <Panel
          title={live ? "Live tracking" : "Delivery route"}
          description={live ? "Where your car is right now." : "The planned route from our South Beach depot."}
          action={live ? <ShareLocation r={r} /> : undefined}
        >
          <LiveRentalMap reservation={r} height={320} />
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Details">
          <dl>
            <DetailRow label="Insurance">{r.insurance === "nxl" ? "NXL coverage" : r.insurance === "own" ? "Own policy" : "—"}</DetailRow>
            {r.listingKind === "car" ? <DetailRow label="Delivery">{r.deliveryAddress ?? "Collect at the depot"}</DetailRow> : null}
            {r.listingKind === "car" ? <DetailRow label="Collection">{r.pickupAddress ?? "Return to the depot"}</DetailRow> : null}
            {driver ? (
              <DetailRow label="Your driver">
                <a href={`tel:${driver.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1.5 text-gold hover:underline">
                  <Phone aria-hidden width={13} height={13} /> {driver.name}
                </a>
              </DetailRow>
            ) : null}
            <DetailRow label="Deposit">
              {money(r.deposit)} · <span className="capitalize">{r.depositStatus}</span>
            </DetailRow>
            <DetailRow label="Paid with">
              {r.payment?.method === "wallet" ? "Drive Wallet" : r.payment?.method === "split" ? `Wallet + card ···· ${r.payment.last4}` : r.payment?.last4 ? `Card ···· ${r.payment.last4}` : "Card"}
            </DetailRow>
            {r.promoCode ? <DetailRow label="Promo">{r.promoCode}</DetailRow> : null}
          </dl>
        </Panel>
        <Panel title="Receipt">
          <dl className="space-y-2.5 text-sm">
            {r.lineItems.map((li) => (
              <div key={li.key} className="flex justify-between gap-4">
                <dt className={cn("text-muted", li.kind === "credit" && "text-success")}>{li.label}</dt>
                <dd className={cn("font-mono tabular-nums", li.kind === "credit" ? "text-success" : li.kind === "info" ? "text-xs text-muted-dim" : "text-cream")}>
                  {li.kind === "info" ? (li.note ?? money(li.amount)) : money(li.amount)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-line pt-3 font-semibold">
              <dt className="text-cream">Total</dt>
              <dd className="font-mono tabular-nums text-cream">{money(r.total)}</dd>
            </div>
            {r.walletApplied ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">From Drive Wallet</dt>
                <dd className="font-mono tabular-nums text-cream/80">{money(r.walletApplied)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Points earned</dt>
              <dd className="font-mono tabular-nums text-gold">+{r.pointsEarned.toLocaleString()}</dd>
            </div>
          </dl>
          <Button variant="ghost" size="sm" className="mt-4 px-0" onClick={() => window.print()}>
            Print receipt
          </Button>
        </Panel>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        size="sm"
        title="Cancel this booking?"
        description={
          late
            ? "You're inside 48 hours of the start. The concierge may apply the late-cancellation terms."
            : "You're more than 48 hours out, so cancellation is free."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
            <Button
              variant="outline"
              className="border-danger/50 text-danger hover:border-danger hover:bg-danger/10"
              onClick={() => {
                cancelBooking(r, member, Date.now());
                setConfirmCancel(false);
                toast(`${r.reference} cancelled.`);
              }}
            >
              Cancel booking
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {r.listingName} · {when(r.window.start)}. {r.walletApplied ? `${money(r.walletApplied)} returns to your Drive Wallet.` : ""}
        </p>
      </Modal>

      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} r={r} author={member.name} />
    </div>
  );
}

/** The prototype's RenterGeoTracker, made opt-in: the renter chooses to share. */
function ShareLocation({ r }: { r: Reservation }) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watch = useRef<number | null>(null);
  const latest = useRef(r);
  useEffect(() => {
    latest.current = r;
  });

  useEffect(() => {
    if (!on) return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setError("Location isn't available in this browser."));
      return;
    }
    watch.current = navigator.geolocation.watchPosition(
      (pos) => reportRenterPosition(latest.current, pos.coords.latitude, pos.coords.longitude),
      () => {
        setError("Location permission was denied.");
        setOn(false);
      },
      { enableHighAccuracy: true, maximumAge: 20_000, timeout: 15_000 },
    );
    return () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    };
  }, [on]);

  return (
    <div className="text-right">
      <Button size="sm" variant={on ? "primary" : "outline"} onClick={() => setOn((v) => !v)}>
        <LocateFixed aria-hidden width={14} height={14} />
        {on ? "Sharing location" : "Share my location"}
      </Button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function ReviewModal({ open, onClose, r, author }: { open: boolean; onClose: () => void; r: Reservation; author: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Review the ${r.listingName}`}
      description="Reviews appear on the listing page. Only members with a completed trip can post."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={comment.trim().length < 10}
            onClick={() => {
              create<Review>(C.reviews, { id: newId("rv"), listingId: r.listingId, authorName: author, rating, comment: comment.trim(), createdAt: Date.now() });
              toast("Thanks — your review is live.");
              onClose();
            }}
          >
            Post review
          </Button>
        </>
      }
    >
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}>
            <Star width={28} height={28} className={n <= rating ? "fill-gold text-gold" : "text-line-strong"} />
          </button>
        ))}
      </div>
      <Textarea className="mt-4" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What made the trip? (10 characters minimum)" />
    </Modal>
  );
}
