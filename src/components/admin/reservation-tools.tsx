"use client";

import { useState } from "react";
import { Banknote, Camera, Check, CreditCard, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { durationMs, PRICING, quote, unitAdverb, unitLabel, unitsFor } from "@/lib/domain/pricing";
import { geocode } from "@/lib/domain/geo";
import { EMPTY_CARD, parseCard, type CardInput } from "@/lib/domain/account";
import type { InsuranceChoice, Listing, RateUnit } from "@/lib/domain/types";
import type { Customer, Driver, Inspection, Reservation, StaffMember } from "@/lib/domain/operations";
import { STAFF_ROLE_LABEL, canAccess } from "@/lib/domain/operations";
import { useStaff } from "@/lib/auth/staff-session";
import { C, logAudit, nextReference, notify, raiseAlert, scheduleReminders, updateReservation } from "@/lib/data/demo";
import { create } from "@/lib/data/demo-store";
import { timestamp } from "@/lib/hooks/use-clock";
import { LiveRentalMap } from "@/components/maps/live-rental-map";
import { CardFields } from "@/components/checkout/card-fields";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Stepper } from "@/components/ui/controls";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { StepIndicator } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { Status } from "./status";

/**
 * Reservation operations shared by the Reservations, Customers and Overview
 * consoles. Every action writes through the demo store, so the member's
 * booking page and the driver portal see the same change.
 */

export function useActor(): { name: string; role: StaffMember["role"]; isMaster: boolean } {
  const s = useStaff();
  const staff = s.status === "signed-in" ? s.staff : null;
  return {
    name: staff?.name ?? "Staff",
    role: staff?.role ?? "employee",
    isMaster: staff ? canAccess(staff.role, "master") : false,
  };
}

const when = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ms));

/* --------------------------------- actions -------------------------------- */

export function confirmReservation(r: Reservation, actor: string) {
  updateReservation(r, { status: "confirmed" }, actor, "reservation.confirmed", "Confirmed by staff");
  notify({ email: r.email, kind: "confirmation", at: timestamp(), title: `Confirmed — ${r.listingName}`, body: `Reservation ${r.reference} is confirmed for ${when(r.window.start)}.`, href: `/account/bookings/${r.id}` });
}

export function checkOut(r: Reservation, actor: string) {
  const to = r.listingKind === "car" ? "checked_out" : "active";
  updateReservation(r, { status: to, driverJob: r.driverId ? "delivered" : r.driverJob }, actor, "reservation.checked_out", r.listingKind === "car" ? "Keys handed over" : "Guest checked in");
  notify({ email: r.email, kind: "pickup", at: timestamp(), title: r.listingKind === "car" ? "Enjoy the drive" : "Welcome in", body: `${r.listingName} is yours until ${when(r.window.end)}.`, href: `/account/bookings/${r.id}` });
}

export function cancelReservation(r: Reservation, actor: string) {
  updateReservation(r, { status: "cancelled", depositStatus: "refunded", driverJob: null }, actor, "reservation.cancelled", "Cancelled by staff");
  notify({ email: r.email, kind: "update", at: timestamp(), title: `Cancelled — ${r.listingName}`, body: `Reservation ${r.reference} was cancelled by the NXL team. Any hold has been released.`, href: `/account/bookings/${r.id}` });
}

export function assignDriver(r: Reservation, driver: Driver | null, actor: string) {
  updateReservation(
    r,
    { driverId: driver?.id ?? null, driverJob: driver ? "assigned" : null },
    actor,
    "driver.assigned",
    driver ? `${driver.name} → ${r.deliveryAddress ?? "depot"}` : "Driver removed",
  );
  if (driver) {
    notify({ email: r.email, kind: "update", at: timestamp(), title: "Your driver is assigned", body: `${driver.name} will deliver the ${r.listingName}. You can call them from your booking.`, href: `/account/bookings/${r.id}` });
  }
}

/* --------------------------------- drawer --------------------------------- */

export function ReservationDrawer({
  r,
  drivers,
  onClose,
  onDeposit,
  onReturn,
}: {
  r: Reservation | null;
  drivers: Driver[];
  onClose: () => void;
  onDeposit: (r: Reservation) => void;
  onReturn: (r: Reservation) => void;
}) {
  const actor = useActor();
  if (!r) return null;
  const driver = drivers.find((d) => d.id === r.driverId) ?? null;
  const dispatchable = drivers.filter((d) => d.license === "verified");
  const open = r.status !== "completed" && r.status !== "cancelled";
  const live = r.status === "checked_out" || r.status === "active";

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      eyebrow={`${r.reference} · ${r.channel}${r.partnerCode ? ` · ${r.partnerCode}` : ""}`}
      title={r.listingName}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <Status kind="booking" value={r.status} />
          {when(r.window.start)} → {when(r.window.end)}
        </span>
      }
      footer={
        open ? (
          <>
            {r.status === "pending" || r.status === "confirmed" ? (
              <Button variant="ghost" className="mr-auto text-danger hover:text-danger" onClick={() => { cancelReservation(r, actor.name); toast(`${r.reference} cancelled.`); }}>
                Cancel booking
              </Button>
            ) : null}
            {r.depositStatus === "held" && actor.isMaster ? (
              <Button variant="outline" onClick={() => onDeposit(r)}>
                <Banknote aria-hidden width={15} height={15} /> Collect deposit
              </Button>
            ) : null}
            {r.status === "pending" ? (
              <Button onClick={() => { confirmReservation(r, actor.name); toast(`${r.reference} confirmed.`); }}>Confirm</Button>
            ) : r.status === "confirmed" ? (
              <Button onClick={() => { checkOut(r, actor.name); toast(`${r.reference} handed over.`); }}>
                {r.listingKind === "car" ? "Check out · hand over keys" : "Check guest in"}
              </Button>
            ) : live ? (
              <Button onClick={() => onReturn(r)}>{r.listingKind === "car" ? "Check in & inspect" : "Check out & inspect"}</Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2">
          <Info label="Guest" value={r.guestName} sub={`${r.email} · ${r.phone}`} />
          <Info label="Rental" value={unitLabel(r.unit, r.qty)} sub={`${r.insurance === "nxl" ? "NXL coverage" : r.insurance === "own" ? "Own policy" : "Insurance —"}`} />
          <Info label="Total" value={money(r.total)} sub={r.payment?.last4 ? `Card ···· ${r.payment.last4}${r.walletApplied ? ` + ${money(r.walletApplied)} wallet` : ""}` : r.payment?.method === "cash" ? "Cash" : r.payment?.method === "wallet" ? "Drive Wallet" : "—"} />
          <Info label="Deposit" value={`${money(r.deposit)} · ${r.depositStatus}`} sub={r.closeout ? `Refunded ${money(r.closeout.refunded)} · by ${r.closeout.by}` : "Hold placed at pickup"} />
          {r.listingKind === "car" ? <Info label="Delivery" value={r.deliveryAddress ?? "Depot pickup"} sub={r.pickupAddress ? `Collect from ${r.pickupAddress}` : "Return to depot"} /> : null}
          {r.notes ? <Info label="Guest notes" value={r.notes} /> : null}
        </section>

        {r.listingKind === "car" && open ? (
          <section>
            <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Driver</p>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-ink/40 p-3">
              <Select
                aria-label="Assign driver"
                value={r.driverId ?? ""}
                onChange={(e) => {
                  const d = drivers.find((x) => x.id === e.target.value) ?? null;
                  assignDriver(r, d, actor.name);
                  toast(d ? `${d.name} assigned.` : "Driver removed.");
                }}
                className="h-10 max-w-xs py-2"
              >
                <option value="">{r.deliveryAddress ? "Unassigned" : "Depot pickup — no driver"}</option>
                {dispatchable.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} · {d.zone}</option>
                ))}
              </Select>
              {driver ? (
                <>
                  <Badge tone="gold">{(r.driverJob ?? "assigned").replace("_", " ")}</Badge>
                  <a href={`tel:${driver.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline">
                    <Phone aria-hidden width={12} height={12} /> {driver.phone}
                  </a>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {r.listingKind === "car" && r.status !== "cancelled" ? (
          <section>
            <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{live ? "Live GPS" : "Route"}</p>
            <LiveRentalMap reservation={r} height={260} />
          </section>
        ) : null}

        <section>
          <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Charges</p>
          <dl className="space-y-1.5 rounded-lg border border-line bg-ink/40 p-4 text-sm">
            {r.lineItems.map((li) => (
              <div key={li.key} className="flex justify-between gap-4">
                <dt className="text-muted">{li.label}</dt>
                <dd className={cn("font-mono tabular-nums", li.kind === "credit" ? "text-success" : "text-cream")}>{li.kind === "info" ? li.note : money(li.amount)}</dd>
              </div>
            ))}
            {r.closeout ? (
              <>
                {r.closeout.damageCharge ? <div className="flex justify-between"><dt className="text-danger">Damage (from deposit)</dt><dd className="font-mono text-danger">{money(r.closeout.damageCharge)}</dd></div> : null}
                {r.closeout.cleaningFee ? <div className="flex justify-between"><dt className="text-warning">Cleaning (from deposit)</dt><dd className="font-mono text-warning">{money(r.closeout.cleaningFee)}</dd></div> : null}
              </>
            ) : null}
          </dl>
        </section>

        {r.inspections?.length ? (
          <section className="space-y-3">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Inspections</p>
            {r.inspections.map((i) => (
              <InspectionReport key={i.id} inspection={i} />
            ))}
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink/40 px-4 py-3">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 text-sm text-cream">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-xs text-muted-dim">{sub}</p> : null}
    </div>
  );
}

const STAGE_LABEL = { pickup: "Pre-delivery (at depot)", delivery: "Handover to guest", return: "Return inspection" } as const;

export function InspectionReport({ inspection: i }: { inspection: Inspection }) {
  const [photos, setPhotos] = useState(false);
  const checks = Object.entries(i.checklist);
  return (
    <div className="rounded-lg border border-line bg-ink/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-cream">{STAGE_LABEL[i.stage]}</p>
        <p className="text-xs text-muted">{i.by} · {when(i.at)}</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div><dt className="text-muted">Mileage</dt><dd className="text-cream">{i.mileage?.toLocaleString() ?? "—"}</dd></div>
        <div><dt className="text-muted">Fuel / charge</dt><dd className="text-cream">{i.fuel ?? "—"}</dd></div>
        <div><dt className="text-muted">Exterior</dt><dd className="capitalize text-cream">{i.exterior}</dd></div>
        <div><dt className="text-muted">Interior</dt><dd className="capitalize text-cream">{i.interior}</dd></div>
      </dl>
      {checks.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {checks.map(([k, ok]) => (
            <li key={k} className={cn("rounded-full border px-2 py-0.5 text-[0.6875rem] capitalize", ok ? "border-success/30 text-success" : "border-danger/30 text-danger")}>
              {ok ? "✓" : "✕"} {k}
            </li>
          ))}
        </ul>
      ) : null}
      {i.damage ? <p className="mt-3 text-xs text-danger">Damage: {i.damage}</p> : null}
      {i.notes ? <p className="mt-1 text-xs text-muted">{i.notes}</p> : null}
      {i.photos.length ? (
        <>
          <button type="button" onClick={() => setPhotos((v) => !v)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-gold hover:underline">
            <Camera aria-hidden width={12} height={12} /> {photos ? "Hide" : "Show"} {i.photos.length} photos
          </button>
          {photos ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {i.photos.map((src, n) => (
                // Local data URLs from the driver's camera.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={n} src={src} alt={`Inspection photo ${n + 1}`} className="aspect-square w-full rounded-md object-cover" />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------ deposit modal ----------------------------- */

export function DepositModal({ r, onClose }: { r: Reservation | null; onClose: () => void }) {
  const actor = useActor();
  const [method, setMethod] = useState<"card" | "cash">("card");
  const [busy, setBusy] = useState(false);
  if (!r) return null;
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      eyebrow={r.reference}
      title={`Collect ${money(r.deposit)} deposit`}
      description="Converts the pickup hold into a collected deposit. It is settled at the return inspection."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await new Promise((res) => setTimeout(res, 900));
              updateReservation(r, { depositStatus: "charged" }, actor.name, "deposit.charged", `${money(r.deposit)} by ${method}`);
              toast(`${money(r.deposit)} deposit collected by ${method}.`);
              setBusy(false);
              onClose();
            }}
          >
            {busy ? "Processing…" : `Collect ${money(r.deposit)}`}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {(["card", "cash"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={cn("flex items-center gap-3 rounded-lg p-4 text-left", method === m ? "edge-gold" : "border border-line bg-ink/40")}
          >
            {m === "card" ? <CreditCard aria-hidden width={18} height={18} className="text-gold" /> : <Banknote aria-hidden width={18} height={18} className="text-gold" />}
            <span className="text-sm capitalize text-cream">{m === "card" ? `Card ···· ${r.payment?.last4 ?? "on file"}` : "Cash"}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-dim">Demo: no card is charged until the payment processor is connected.</p>
    </Modal>
  );
}

/* --------------------------- return / close-out --------------------------- */

export function ReturnModal({ r, onClose }: { r: Reservation | null; onClose: () => void }) {
  const actor = useActor();
  const [damage, setDamage] = useState(false);
  const [damageCharge, setDamageCharge] = useState(0);
  const [cleaning, setCleaning] = useState(0);
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  if (!r) return null;
  const cap = r.deposit;
  const charges = Math.min(cap, (damage ? damageCharge : 0) + cleaning);
  const refund = cap - charges;

  function submit() {
    if (!r) return;
    const inspection: Inspection = {
      id: `insp-${timestamp().toString(36)}`,
      stage: "return",
      at: timestamp(),
      by: actor.name,
      mileage: mileage ? Number(mileage) : null,
      fuel: null,
      exterior: damage ? "major" : "clean",
      interior: cleaning > 0 ? "minor" : "clean",
      damage: damage ? notes || "Damage recorded" : null,
      checklist: {},
      photos: [],
      notes: !damage && notes ? notes : null,
    };
    updateReservation(
      r,
      {
        status: "completed",
        driverJob: r.driverJob,
        depositStatus: charges >= cap && cap > 0 ? "forfeited" : "refunded",
        inspections: [...(r.inspections ?? []), inspection],
        closeout: { at: timestamp(), by: actor.name, damageCharge: damage ? Math.min(damageCharge, cap) : 0, cleaningFee: cleaning, notes: notes || null, refunded: refund },
      },
      actor.name,
      "reservation.closed_out",
      charges ? `${money(charges)} kept from deposit · ${money(refund)} released` : `Clean return · ${money(refund)} released`,
    );
    notify({
      email: r.email,
      kind: "return",
      at: timestamp(),
      title: charges ? "Return inspected" : "Deposit released",
      body: charges ? `${money(refund)} of your ${money(cap)} deposit is released. ${money(charges)} covers ${damage ? "damage" : "cleaning"} — see your booking for details.` : `Thanks for driving with NXL. Your full ${money(cap)} deposit has been released.`,
      href: `/account/bookings/${r.id}`,
    });
    if (damage) raiseAlert("fleet", "Damage reported", `${r.listingName} returned with damage (${r.reference}).`);
    toast(`${r.reference} closed out — ${money(refund)} released.`);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={r.reference}
      title={`${r.listingKind === "car" ? "Check in" : "Check out"} & settle deposit`}
      description={`${r.listingName} · ${r.guestName} · ${money(r.deposit)} deposit ${r.depositStatus}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Close out booking</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setDamage(false)} className={cn("rounded-lg p-4 text-left text-sm", !damage ? "edge-gold text-cream" : "border border-line bg-ink/40 text-muted")}>✓ No damage</button>
          <button type="button" onClick={() => setDamage(true)} className={cn("rounded-lg p-4 text-left text-sm", damage ? "border border-danger/60 bg-danger-dim/40 text-danger" : "border border-line bg-ink/40 text-muted")}>⚠ Damage found</button>
        </div>
        {r.listingKind === "car" ? (
          <Field label="Odometer at return" htmlFor="ret-miles">
            <Input id="ret-miles" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 12480" />
          </Field>
        ) : null}
        {damage ? (
          <Field label={`Damage charge (max ${money(cap)})`} htmlFor="ret-dmg">
            <div className="flex flex-wrap gap-2">
              {[100, 250, 500, cap].map((v) => (
                <button key={v} type="button" onClick={() => setDamageCharge(v)} className={cn("rounded-full border px-3 py-1.5 text-xs", damageCharge === v ? "border-gold text-gold" : "border-line text-cream/80")}>{money(v)}</button>
              ))}
              <Input id="ret-dmg" inputMode="numeric" value={damageCharge || ""} onChange={(e) => setDamageCharge(Math.min(cap, Number(e.target.value.replace(/\D/g, "")) || 0))} className="h-9 max-w-32 py-1.5" />
            </div>
          </Field>
        ) : null}
        <Field label={r.listingKind === "home" ? "Cleaning fee" : "Detailing fee"} htmlFor="ret-clean" hint="Only if it came back in a state that needs more than the standard turnaround.">
          <div className="flex flex-wrap gap-2">
            {[0, 150, 450].map((v) => (
              <button key={v} type="button" onClick={() => setCleaning(v)} className={cn("rounded-full border px-3 py-1.5 text-xs", cleaning === v ? "border-gold text-gold" : "border-line text-cream/80")}>{v ? money(v) : "None"}</button>
            ))}
          </div>
        </Field>
        <Field label="Internal notes" htmlFor="ret-notes">
          <Textarea id="ret-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={damage ? "Describe the damage and where it is" : "Anything worth recording"} />
        </Field>
        <dl className="space-y-1.5 rounded-lg border border-line bg-ink/40 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Deposit</dt><dd className="font-mono text-cream">{money(cap)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Kept for charges</dt><dd className="font-mono text-danger">−{money(charges)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt className="text-cream">Released to guest</dt><dd className="font-mono text-success">{money(refund)}</dd></div>
        </dl>
      </div>
    </Modal>
  );
}

/* --------------------------- concierge booking ---------------------------- */

const STEPS = ["Booking", "Insurance", "Payment", "Confirm"];

export function NewReservationModal({
  open,
  onClose,
  listings,
  drivers,
  guest,
}: {
  open: boolean;
  onClose: () => void;
  listings: Listing[];
  drivers: Driver[];
  guest?: Pick<Customer, "name" | "email" | "phone"> | null;
}) {
  const actor = useActor();
  const bookable = listings.filter((l) => l.status !== "maintenance");
  const [step, setStep] = useState(0);
  const [listingId, setListingId] = useState(bookable[0]?.id ?? "");
  const listing = bookable.find((l) => l.id === listingId) ?? bookable[0];
  const [unit, setUnit] = useState<RateUnit>(unitsFor(listing)[1] ?? unitsFor(listing)[0]);
  const [qty, setQty] = useState(1);
  const [start, setStart] = useState("");
  const [name, setName] = useState(guest?.name ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [delivery, setDelivery] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");
  const [insurance, setInsurance] = useState<InsuranceChoice>("own");
  const [method, setMethod] = useState<"card" | "cash">("card");
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [override, setOverride] = useState("");
  const [error, setError] = useState<string | null>(null);

  const q = quote({
    listing,
    unit,
    qty,
    insurance,
    delivery: listing.kind === "car" ? { enabled: !!delivery.trim() } : undefined,
  });
  const total = override ? Number(override) : q.dueNow;

  function next() {
    setError(null);
    if (step === 0) {
      if (name.trim().length < 2 || !/\S+@\S+\.\S+/.test(email)) return setError("Enter the guest's name and email.");
      if (!start) return setError("Choose the start date and time.");
    }
    if (step === 2 && method === "card") {
      const res = parseCard(card);
      if (!res.ok) return setError(res.error);
    }
    setStep((s) => s + 1);
  }

  function book() {
    const startMs = new Date(start).getTime();
    const last4 = method === "card" ? card.number.replace(/\D/g, "").slice(-4) : null;
    const r: Reservation = {
      id: `res-cc-${timestamp().toString(36)}`,
      reference: nextReference(),
      listingId: listing.id,
      listingKind: listing.kind,
      listingName: listing.name,
      guestName: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      unit,
      qty,
      window: { start: startMs, end: startMs + durationMs(unit, qty) },
      lineItems: override ? [{ key: "rental", label: `${unitLabel(unit, qty)} · concierge rate`, amount: total, kind: "charge" }] : q.lineItems,
      total,
      deposit: q.depositDue,
      depositStatus: "held",
      status: "confirmed",
      insurance,
      pointsEarned: 0,
      createdAt: timestamp(),
      channel: "concierge",
      partnerCode: null,
      driverId: driverId || null,
      driverJob: driverId ? "assigned" : null,
      deliveryAddress: delivery.trim() || null,
      deliveryPoint: delivery.trim() ? geocode(delivery).point : null,
      payment: { method, last4 },
      notes: notes.trim() || null,
      inspections: [],
    };
    create(C.reservations, r);
    scheduleReminders(r);
    logAudit(actor.name, "reservation.created", r.reference, `Concierge booking · ${listing.name} · ${money(total)} · ${method}`);
    toast(`${r.reference} booked for ${r.guestName}.`);
    setStep(0);
    onClose();
  }

  const readOnlyGuest = !!guest;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="Concierge booking"
      title={step === 3 ? "Confirm the booking" : "New reservation"}
      footer={
        <>
          {step > 0 ? <Button variant="ghost" className="mr-auto" onClick={() => setStep((s) => s - 1)}>Back</Button> : null}
          {step < 3 ? <Button onClick={next}>Continue</Button> : <Button onClick={book}><Check aria-hidden width={15} height={15} /> Book & charge {money(total)}</Button>}
        </>
      }
    >
      <StepIndicator steps={STEPS} current={step} className="mb-6" />
      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Listing" htmlFor="nr-listing" className="sm:col-span-2">
            <Select id="nr-listing" value={listing.id} onChange={(e) => { setListingId(e.target.value); const l = bookable.find((x) => x.id === e.target.value)!; setUnit(unitsFor(l)[0]); }}>
              {bookable.map((l) => (
                <option key={l.id} value={l.id}>{l.kind === "car" ? "🚗" : "🏡"} {l.name} · {l.status}</option>
              ))}
            </Select>
          </Field>
          <Field label="Guest name" htmlFor="nr-name" required><Input id="nr-name" value={name} readOnly={readOnlyGuest} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email" htmlFor="nr-email" required><Input id="nr-email" type="email" value={email} readOnly={readOnlyGuest} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Phone" htmlFor="nr-phone"><Input id="nr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Start" htmlFor="nr-start" required><Input id="nr-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <div>
            <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Period</p>
            <SegmentedControl<RateUnit> label="Period" size="sm" value={unit} onChange={setUnit} options={unitsFor(listing).map((u) => ({ value: u, label: unitAdverb(u) }))} />
          </div>
          <div>
            <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Quantity</p>
            <Stepper label="Quantity" value={qty} onChange={setQty} min={1} max={90} />
          </div>
          {listing.kind === "car" ? (
            <>
              <Field label="Deliver to (optional)" htmlFor="nr-deliver"><Input id="nr-deliver" value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="Leave blank for depot pickup" /></Field>
              <Field label="Assign driver" htmlFor="nr-driver">
                <Select id="nr-driver" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                  <option value="">Assign later</option>
                  {drivers.filter((d) => d.license === "verified").map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
            </>
          ) : null}
          <Field label="Internal notes" htmlFor="nr-notes" className="sm:col-span-2"><Textarea id="nr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
      ) : step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["own", "nxl"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setInsurance(k)} className={cn("rounded-xl p-5 text-left", insurance === k ? "edge-gold" : "border border-line bg-ink/40")}>
              <p className="font-medium text-cream">{k === "own" ? "Guest has own insurance" : "NXL coverage"}</p>
              <p className="mt-1 font-mono text-sm text-gold">{k === "own" ? "No fee" : `${money(PRICING.insuranceDaily)}/day`}</p>
            </button>
          ))}
        </div>
      ) : step === 2 ? (
        <div className="space-y-5">
          <SegmentedControl<"card" | "cash"> label="Payment method" value={method} onChange={setMethod} options={[{ value: "card", label: "Card" }, { value: "cash", label: "Cash" }]} />
          {method === "card" ? <CardFields value={card} onChange={setCard} /> : <Alert tone="info">Collect cash at handover and record it on the reservation.</Alert>}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-ink/40 p-4">
            <div>
              <p className="text-sm text-cream">Quoted {money(q.dueNow)}</p>
              <p className="text-xs text-muted-dim">Override for a negotiated concierge rate</p>
            </div>
            <Input aria-label="Override total" inputMode="numeric" value={override} onChange={(e) => setOverride(e.target.value.replace(/\D/g, ""))} placeholder={String(q.dueNow)} className="max-w-36" />
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Listing" value={listing.name} sub={unitLabel(unit, qty)} />
          <Info label="Guest" value={name} sub={email} />
          <Info label="Starts" value={start ? when(new Date(start).getTime()) : "—"} />
          <Info label="Charge" value={money(total)} sub={method === "card" ? `Card ···· ${card.number.replace(/\D/g, "").slice(-4)}` : "Cash"} />
          <Info label="Deposit" value={`${money(q.depositDue)} hold at pickup`} />
          <Info label="Driver" value={drivers.find((d) => d.id === driverId)?.name ?? (delivery ? "Assign later" : "Depot pickup")} />
        </dl>
      )}
      {error ? <Alert tone="danger" className="mt-5">{error}</Alert> : null}
      <p className="mt-4 text-xs text-muted-dim">Booked by {actor.name} ({STAFF_ROLE_LABEL[actor.role]}). Demo: no card is charged.</p>
    </Modal>
  );
}

