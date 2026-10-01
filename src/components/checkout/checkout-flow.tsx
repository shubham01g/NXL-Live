"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  CircleAlert,
  CreditCard,
  IdCard,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { cardLabel, EMPTY_CARD, parseCard, type CardInput } from "@/lib/domain/account";
import { redeemableValue, tierFor } from "@/lib/domain/loyalty";
import {
  checkPromo,
  durationMs,
  PRICING,
  quote,
  settle,
  unitAdverb,
  unitLabel,
  unitSuffix,
  unitsFor,
  rateFor,
  type PromoRule,
} from "@/lib/domain/pricing";
import { PLACES, geocode, roadMilesFromBase } from "@/lib/domain/geo";
import type { InsuranceChoice, Listing, RateUnit } from "@/lib/domain/types";
import { depositTerms, paidWith, type PayMethod, type Promo, type Reservation } from "@/lib/domain/operations";
import { useSession, updateMember } from "@/lib/auth/use-session";
import { useCollection } from "@/lib/data/demo-store";
import { useClock } from "@/lib/hooks/use-clock";
import { C } from "@/lib/data/demo";
import { clashes, placeBooking } from "@/lib/data/checkout";
import { useActiveReferral } from "@/components/site/referral-capture";
import { Button, ButtonLink } from "@/components/ui/button";
import { SegmentedControl, Stepper, Toggle } from "@/components/ui/controls";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import { Media } from "@/components/ui/media";
import { Badge, Eyebrow } from "@/components/ui/primitives";
import { StepIndicator } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { FileDrop } from "@/components/ui/file-drop";
import { LicenceForm } from "@/components/account/sections/licence-panel";
import { CardFields } from "./card-fields";

/**
 * Checkout.
 *
 * Replaces M1's hand-off to the contact form. Four steps — trip, insurance,
 * payment, review — then a confirmation. The price is the same `quote()` the
 * listing page shows, so what the guest saw is what they pay, with promo,
 * points and drive credit applied in the order the Loyalty page promises.
 *
 * Payment is simulated until M5: only the brand and last four are kept. The
 * rental and the deposit can each be paid by card or in cash at pickup.
 * Cars need a driver's licence on file — scanned or uploaded, front and back.
 */

const STEPS = ["Trip", "Insurance", "Payment", "Review"];

const TIMES = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

function isoDate(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtWhen(ms: number) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

export interface CheckoutInitial {
  slug: string | null;
  unit: RateUnit | null;
  qty: number | null;
  insurance: InsuranceChoice | null;
  delivery: boolean;
  pickup: boolean;
}

export function CheckoutFlow({
  listings,
  promos: basePromos,
  initial,
}: {
  listings: Listing[];
  promos: Promo[];
  initial: CheckoutInitial;
}) {
  const session = useSession();
  const pathname = usePathname();

  if (session.status === "loading") {
    return (
      <Container className="pb-24 pt-28">
        <div aria-hidden className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="skeleton h-[32rem] rounded-xl" />
          <div className="skeleton h-96 rounded-xl" />
        </div>
      </Container>
    );
  }

  if (session.status === "signed-out") {
    const back = typeof window === "undefined" ? pathname : `${pathname}${window.location.search}`;
    const next = encodeURIComponent(back);
    return (
      <Container className="pb-24 pt-28">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/40 text-gold">
            <Lock aria-hidden width={22} height={22} />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold text-cream">An NXL account is required</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Your account holds your licence, insurance and card, so every booking after this one is two taps.
            It&apos;s free, and your selections will be waiting when you come back.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href={`/membership?mode=signup&next=${next}`} size="lg">
              Create free account
            </ButtonLink>
            <ButtonLink href={`/membership?next=${next}`} variant="outline" size="lg">
              Sign in
            </ButtonLink>
          </div>
        </div>
      </Container>
    );
  }

  return <Flow listings={listings} basePromos={basePromos} initial={initial} />;
}

function Flow({ listings, basePromos, initial }: { listings: Listing[]; basePromos: Promo[]; initial: CheckoutInitial }) {
  const session = useSession();
  const member = session.status === "signed-in" ? session.member : null;
  const promos = useCollection(C.promos, basePromos);
  const activeReferral = useActiveReferral();

  const bookable = listings.filter((l) => l.status !== "maintenance");
  const [listingId, setListingId] = useState(
    () => (bookable.find((l) => l.slug === initial.slug) ?? bookable[0]).id,
  );
  const listing = bookable.find((l) => l.id === listingId) ?? bookable[0];
  const units = unitsFor(listing);
  const [unit, setUnit] = useState<RateUnit>(initial.unit && units.includes(initial.unit) ? initial.unit : units[0]);
  const [qty, setQty] = useState(initial.qty ?? 1);
  // Start on the first free day from tomorrow, so the guest never lands on a clash.
  const [date, setDate] = useState(() => {
    const at10 = (days: number) => {
      const d = new Date(Date.now() + days * 86_400_000);
      d.setHours(10, 0, 0, 0);
      return d.getTime();
    };
    const u = initial.unit && units.includes(initial.unit) ? initial.unit : units[0];
    for (let day = 1; day <= 45; day++) {
      const start = at10(day);
      if (!clashes(listing, { start, end: start + durationMs(u, initial.qty ?? 1) }).length) return isoDate(start);
    }
    return isoDate(at10(1));
  });
  const [time, setTime] = useState("10:00");
  const isCar = listing.kind === "car";

  const [deliveryOn, setDeliveryOn] = useState(initial.delivery);
  const [deliveryAddress, setDeliveryAddress] = useState(member?.address ? `${member.address.line1}, ${member.address.city}` : "");
  const [pickupOn, setPickupOn] = useState(initial.pickup);
  const [pickupSame, setPickupSame] = useState(true);
  const [pickupAddress, setPickupAddress] = useState("");

  const [phone, setPhone] = useState(member?.phone ?? "");
  const [notes, setNotes] = useState("");

  const [insurance, setInsurance] = useState<InsuranceChoice>(initial.insurance ?? member?.insurance?.kind ?? "own");
  const [carrier, setCarrier] = useState(member?.insurance?.carrier ?? "");
  const [policy, setPolicy] = useState(member?.insurance?.policyNumber ?? "");
  const [policyExpiry, setPolicyExpiry] = useState(
    member?.insurance?.expiresAt ? isoDate(member.insurance.expiresAt).slice(0, 7) : "",
  );
  const [policyDoc, setPolicyDoc] = useState<string | null>(member?.insurance?.document ?? null);
  const [saveInsurance, setSaveInsurance] = useState(!member?.insurance);

  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [depositMethod, setDepositMethod] = useState<PayMethod>("card");

  const [useSavedCard, setUseSavedCard] = useState(!!member?.card);
  const [card, setCard] = useState<CardInput>({ ...EMPTY_CARD, holder: member?.name ?? "" });
  const [saveCard, setSaveCard] = useState(!member?.card);
  const [useWallet, setUseWallet] = useState((member?.credits ?? 0) > 0);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoRule | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);

  const now = useClock(60_000);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState<Reservation | null>(null);

  const start = useMemo(() => new Date(`${date}T${time}:00`).getTime(), [date, time]);
  const window_ = { start, end: start + durationMs(unit, qty) };
  const conflict = Number.isFinite(start) ? clashes(listing, window_) : [];
  const inPast = !Number.isFinite(start) || start < now;

  const deliveryMiles = deliveryOn && deliveryAddress.trim() ? roadMilesFromBase(geocode(deliveryAddress).point) : undefined;
  const pickupAddr = pickupSame ? deliveryAddress : pickupAddress;
  const pickupMiles = pickupOn && pickupAddr.trim() ? roadMilesFromBase(geocode(pickupAddr).point) : undefined;

  const q = quote({
    listing,
    unit,
    qty,
    insurance,
    delivery: isCar ? { enabled: deliveryOn, miles: deliveryMiles } : undefined,
    pickup: isCar ? { enabled: pickupOn, miles: pickupMiles } : undefined,
    memberPoints: member?.points ?? 0,
    enrolled: member?.enrolled ?? false,
  });
  const s = settle(q, {
    promo,
    redeemPoints,
    memberPoints: member?.points ?? 0,
    enrolled: member?.enrolled ?? false,
    walletCredits: member?.credits ?? 0,
    useWallet,
  });

  // A rejected or expired licence has to be replaced before a car goes out.
  const licence = member?.licence ?? null;
  const licenceOk = !!licence && licence.status !== "rejected" && licence.expiresAt > window_.end;
  const cashDue = payMethod === "cash" ? s.cardCharge : 0;
  const cardDue = payMethod === "card" ? s.cardCharge : 0;

  if (!member) return null;
  const tier = tierFor(member.points);
  const pointsDollars = redeemableValue(member.points);

  if (done) return <Confirmation reservation={done} listing={listing} />;

  /* -------------------------------- guards -------------------------------- */

  function validate(i: number): string | null {
    if (i === 0) {
      if (inPast) return "Choose a start time in the future.";
      if (conflict.length) return "Those dates overlap an existing booking. Pick another window.";
      if (isCar && deliveryOn && !deliveryAddress.trim()) return "Enter the delivery address.";
      if (isCar && pickupOn && !pickupSame && !pickupAddress.trim()) return "Enter the collection address.";
      if (phone.replace(/\D/g, "").length < 7) return "Enter a phone number the concierge can reach you on.";
    }
    if (i === 1 && isCar && !licenceOk) return "Add your driver's licence — scan or upload the front and back.";
    if (i === 1 && insurance === "own") {
      if (!carrier.trim() || !policy.trim() || !policyExpiry) return "Enter your carrier, policy number and expiry — or choose NXL coverage.";
      if (new Date(`${policyExpiry}-28`).getTime() < window_.end) return "Your policy expires before the rental ends.";
    }
    if (i === 2 && payMethod === "card" && s.cardCharge > 0 && !(useSavedCard && member?.card)) {
      const res = parseCard(card);
      if (!res.ok) return res.error;
    }
    return null;
  }

  function go(to: number) {
    if (to > step) {
      for (let i = step; i < to; i++) {
        const problem = validate(i);
        if (problem) {
          setError(problem);
          return;
        }
      }
    }
    setError(null);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyPromo() {
    const res = checkPromo(promoInput, promos, listing, q.dueNow);
    if (res.ok) {
      setPromo(res.promo);
      setPromoError(null);
      toast(`${res.promo.code} applied — ${res.promo.description}.`);
    } else {
      setPromo(null);
      setPromoError(res.error);
    }
  }

  async function confirm() {
    if (!member) return;
    if (!terms) {
      setError("Please accept the rental terms and deposit policy.");
      return;
    }
    for (let i = 0; i < 3; i++) {
      const problem = validate(i);
      if (problem) {
        setError(problem);
        setStep(i);
        return;
      }
    }
    setError(null);
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1200));

    const parsed = payMethod === "card" && !(useSavedCard && member.card) && s.cardCharge > 0 ? parseCard(card) : null;
    const newCard = parsed && parsed.ok ? parsed.card : null;
    const chargeCard = useSavedCard && member.card ? member.card : newCard;

    // Keep what the member chose to save on their account.
    updateMember((m) => ({
      ...m,
      phone: m.phone ?? phone,
      card: saveCard && newCard ? newCard : m.card,
      insurance:
        saveInsurance || !m.insurance
          ? insurance === "nxl"
            ? { kind: "nxl", carrier: null, policyNumber: null, expiresAt: null, verified: true }
            : { kind: "own", carrier: carrier.trim(), policyNumber: policy.trim(), expiresAt: new Date(`${policyExpiry}-28`).getTime(), verified: false, document: policyDoc }
          : m.insurance?.kind === "own" && policyDoc
            ? { ...m.insurance, document: policyDoc }
            : m.insurance,
    }));

    const reservation = placeBooking(
      {
        listing,
        unit,
        qty,
        start,
        guestName: member.name,
        email: member.email,
        phone,
        insurance,
        delivery: isCar && deliveryOn ? deliveryAddress.trim() : null,
        pickup: isCar && pickupOn ? pickupAddr.trim() : null,
        settlement: s,
        quoteDeposit: q.depositDue,
        promoCode: promo?.code ?? null,
        card: payMethod === "card" && chargeCard ? { last4: chargeCard.last4, brand: chargeCard.brand } : null,
        payMethod,
        depositMethod,
        partnerCode: activeReferral?.code ?? null,
        notes: notes.trim() || null,
      },
      member,
    );
    setPlacing(false);
    setDone(reservation);
    toast(`Reservation ${reservation.reference} confirmed.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* -------------------------------- render -------------------------------- */

  return (
    <Container className="pb-28 pt-24 sm:pt-28">
      <Link href={`/${listing.kind === "car" ? "cars" : "homes"}/${listing.slug}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-gold">
        <ArrowLeft aria-hidden width={14} height={14} />
        Back to {listing.name}
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Secure checkout</Eyebrow>
          <h1 className="mt-4 font-display text-display-4 text-cream sm:text-display-3">Reserve {listing.name}</h1>
        </div>
        {activeReferral ? <Badge tone="gold">Referred by {activeReferral.business}</Badge> : null}
      </div>

      <StepIndicator className="mt-8" steps={STEPS} current={step} onSelect={go} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-10">
        <div className="min-w-0 space-y-6">
          {step === 0 ? (
            <>
              <Card title="Your trip" icon={CalendarDays}>
                <div className="grid gap-5">
                  <Field label="Listing" htmlFor="co-listing">
                    <Select
                      id="co-listing"
                      value={listing.id}
                      onChange={(e) => {
                        const next = bookable.find((l) => l.id === e.target.value)!;
                        setListingId(next.id);
                        const nu = unitsFor(next);
                        if (!nu.includes(unit)) setUnit(nu[0]);
                        setPromo(null);
                      }}
                    >
                      <optgroup label="Exotic cars">
                        {bookable.filter((l) => l.kind === "car").map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Luxury estates">
                        {bookable.filter((l) => l.kind === "home").map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </optgroup>
                    </Select>
                  </Field>

                  <div>
                    <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Rental period</p>
                    <SegmentedControl
                      label="Rental period"
                      size="sm"
                      value={unit}
                      onChange={(u) => {
                        setUnit(u);
                        setQty(1);
                      }}
                      options={units.map((u) => ({ value: u, label: `${unitAdverb(u)} · ${money(rateFor(listing, u))}` }))}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label={isCar ? "Pickup date" : "Check-in date"} htmlFor="co-date" required>
                      <Input id="co-date" type="date" min={isoDate(now)} value={date} onChange={(e) => setDate(e.target.value)} />
                    </Field>
                    <Field label="Time" htmlFor="co-time">
                      <Select id="co-time" value={time} onChange={(e) => setTime(e.target.value)}>
                        {TIMES.map((t) => (
                          <option key={t} value={t}>
                            {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(`2000-01-01T${t}:00`))}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div>
                      <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">How many {unit}s</p>
                      <Stepper label={`Number of ${unit}s`} value={qty} onChange={setQty} min={1} max={unit === "hour" ? 12 : unit === "month" ? 6 : 60} />
                    </div>
                  </div>

                  {Number.isFinite(start) ? (
                    conflict.length ? (
                      <Alert tone="danger" title="Not available for those dates">
                        Already booked {conflict.map((w) => `${fmtWhen(w.start)} – ${fmtWhen(w.end)}`).join("; ")}. Try another window, or
                        ask the concierge to join the waitlist.
                      </Alert>
                    ) : inPast ? (
                      <Alert tone="warning">That start time has passed — choose a later one.</Alert>
                    ) : (
                      <Alert tone="success" title="Available">
                        {fmtWhen(window_.start)} → {fmtWhen(window_.end)}
                      </Alert>
                    )
                  ) : null}
                </div>
              </Card>

              {isCar ? (
                <Card title="Delivery & collection" icon={MapPin} description={
                  tier.min >= 2500
                    ? `Complimentary for ${tier.name} members.`
                    : `${money(PRICING.delivery.fee)} within ${PRICING.delivery.baseMiles} mi of South Beach, then ${money(PRICING.delivery.extraPerMile)}/mi.`
                }>
                  <datalist id="nxl-places">
                    {PLACES.map((p) => (
                      <option key={p.id} value={`${p.name}, ${p.address}`} />
                    ))}
                  </datalist>
                  <div className="space-y-5">
                    <ToggleRow label="Deliver the car to me" hint="Or collect it at 1200 Ocean Drive" checked={deliveryOn} onChange={setDeliveryOn} />
                    {deliveryOn ? (
                      <AddressInput id="co-delivery" label="Delivery address" value={deliveryAddress} onChange={setDeliveryAddress} miles={deliveryMiles} />
                    ) : null}
                    <ToggleRow label="Collect it from me after" hint="Or return it to the depot" checked={pickupOn} onChange={setPickupOn} />
                    {pickupOn ? (
                      <>
                        {deliveryOn ? (
                          <label className="flex items-center gap-2 text-sm text-cream/85">
                            <input type="checkbox" checked={pickupSame} onChange={(e) => setPickupSame(e.target.checked)} className="accent-[#c4a068]" />
                            Same address as delivery
                          </label>
                        ) : null}
                        {!pickupSame || !deliveryOn ? (
                          <AddressInput id="co-pickup" label="Collection address" value={pickupAddress} onChange={setPickupAddress} miles={pickupMiles} />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </Card>
              ) : null}

              <Card title="Contact" icon={Sparkles}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" htmlFor="co-name">
                    <Input id="co-name" value={member.name} readOnly />
                  </Field>
                  <Field label="Email" htmlFor="co-email">
                    <Input id="co-email" value={member.email} readOnly />
                  </Field>
                  <Field label="Mobile" htmlFor="co-phone" required hint="Your concierge texts you before handover.">
                    <Input id="co-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label="Notes for the concierge" htmlFor="co-notes" className="sm:col-span-2">
                    <Textarea id="co-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, flight number, a child seat…" />
                  </Field>
                </div>
              </Card>
            </>
          ) : null}

          {step === 1 ? (
            <Card title="Insurance" icon={ShieldCheck} description="Every rental is covered. Use your own policy at no charge, or add ours.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice
                  selected={insurance === "own"}
                  onClick={() => setInsurance("own")}
                  title="My own policy"
                  price="No fee"
                  body="We verify your policy before delivery. Collision and liability must carry over to rentals."
                />
                <Choice
                  selected={insurance === "nxl"}
                  onClick={() => setInsurance("nxl")}
                  title="NXL coverage"
                  price={`${money(PRICING.insuranceDaily)}/day`}
                  body="Collision, theft, liability and roadside — no deductible on approved claims."
                />
              </div>
              {insurance === "own" ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                  <Field label="Carrier" htmlFor="co-carrier" required>
                    <Input id="co-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Chubb, AIG, PURE…" />
                  </Field>
                  <Field label="Policy number" htmlFor="co-policy" required>
                    <Input id="co-policy" value={policy} onChange={(e) => setPolicy(e.target.value)} />
                  </Field>
                  <Field label="Expires" htmlFor="co-pexp" required>
                    <Input id="co-pexp" type="month" value={policyExpiry} onChange={(e) => setPolicyExpiry(e.target.value)} />
                  </Field>
                  <FileDrop
                    className="sm:col-span-3"
                    label="Insurance card or declarations page"
                    hint="Optional — scan it, upload a photo or drop a PDF. Verification is faster with it."
                    value={policyDoc}
                    onChange={setPolicyDoc}
                    aspect="aspect-[3/1]"
                  />
                </div>
              ) : (
                <ul className="mt-6 grid gap-2 text-sm text-cream/85 sm:grid-cols-2">
                  {["Collision & comprehensive", "Theft protection", "$1M liability", "24/7 roadside", "Loss of use waived", "No deductible on approved claims"].map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <Check aria-hidden width={14} height={14} className="text-success" />
                      {x}
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-6 flex items-center gap-2 text-sm text-cream/85">
                <input type="checkbox" checked={saveInsurance} onChange={(e) => setSaveInsurance(e.target.checked)} className="accent-[#c4a068]" />
                Save this to my account for next time
              </label>
            </Card>
          ) : null}

          {step === 1 && isCar ? (
            <Card
              title="Driver's licence"
              icon={IdCard}
              description={licenceOk ? "On file — the team checks it before the car goes out." : "Required to rent a car. Scan or upload the front and back."}
            >
              {licenceOk && licence ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-cream">
                    {licence.state} · <span className="font-mono">{licence.number}</span> · expires {new Date(licence.expiresAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                  <Badge tone={licence.status === "verified" ? "success" : "warning"}>{licence.status === "verified" ? "Verified" : "In review"}</Badge>
                </div>
              ) : (
                <>
                  {licence ? (
                    <Alert tone="warning" className="mb-5">
                      {licence.status === "rejected" ? (licence.note ?? "The team asked for a new licence image.") : "Your licence on file expires before this rental ends."} Add a current one below.
                    </Alert>
                  ) : null}
                  <LicenceForm />
                </>
              )}
            </Card>
          ) : null}

          {step === 2 ? (
            <>
              <Card title="How you'll pay" icon={Banknote} description="Card or cash — for the rental and the security deposit.">
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Rental</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Choice selected={payMethod === "card"} onClick={() => setPayMethod("card")} title="Credit / debit card" price={s.cardCharge > 0 ? `${money(s.cardCharge)} today` : ""} body="Charged now to secure the booking." />
                  <Choice selected={payMethod === "cash"} onClick={() => setPayMethod("cash")} title="Cash" price={s.cardCharge > 0 ? `${money(s.cardCharge)} at pickup` : ""} body="Pay in full in person at handover. Exact or rounded-up amounts, please." />
                </div>
                <p className="mb-2 mt-6 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Security deposit · {money(q.depositDue)}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Choice selected={depositMethod === "card"} onClick={() => setDepositMethod("card")} title="Card hold" price="" body="A hold on your card at pickup — not a charge. Released after a clean return." />
                  <Choice selected={depositMethod === "cash"} onClick={() => setDepositMethod("cash")} title="Cash" price="" body="Handed over at pickup and returned in cash after a clean return inspection." />
                </div>
                {cashDue > 0 || depositMethod === "cash" ? (
                  <Alert tone="info" className="mt-5" title={`Bring ${money(cashDue + (depositMethod === "cash" ? q.depositDue : 0))} in cash to pickup`}>
                    {[cashDue > 0 ? `${money(cashDue)} rental` : null, depositMethod === "cash" ? `${money(q.depositDue)} deposit` : null].filter(Boolean).join(" + ")}. Your driver or the depot gives you a receipt.
                  </Alert>
                ) : null}
              </Card>

              {payMethod === "card" && (s.cardCharge > 0 || !useWallet) ? (
                <Card title="Card" icon={CreditCard} description={depositMethod === "card" ? "Charged for the rental today. The deposit is a hold at pickup, not a charge." : "Charged for the rental today."}>
                  {member.card ? (
                    <div className="mb-5 grid gap-3 sm:grid-cols-2">
                      <Choice selected={useSavedCard} onClick={() => setUseSavedCard(true)} title={cardLabel(member.card)} price="On file" body={`Expires ${String(member.card.expMonth).padStart(2, "0")}/${String(member.card.expYear).slice(-2)}`} />
                      <Choice selected={!useSavedCard} onClick={() => setUseSavedCard(false)} title="Use a new card" price="" body="Visa, Mastercard, Amex or Discover" />
                    </div>
                  ) : null}
                  {!useSavedCard || !member.card ? (
                    <>
                      <CardFields value={card} onChange={setCard} />
                      <label className="mt-5 flex items-center gap-2 text-sm text-cream/85">
                        <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="accent-[#c4a068]" />
                        Save this card to my account
                      </label>
                    </>
                  ) : null}
                </Card>
              ) : null}

              <Card title="Credits & rewards" icon={Wallet}>
                <div className="space-y-4">
                  <ToggleRow
                    label={`Use Drive Wallet credit · ${money(member.credits)} available`}
                    hint={member.credits > 0 ? "Applied after any promo and points." : "No credit loaded — see Drive Wallet plans."}
                    checked={useWallet && member.credits > 0}
                    disabled={member.credits <= 0}
                    onChange={setUseWallet}
                  />
                  <ToggleRow
                    label={`Redeem Level Rewards · ${member.points.toLocaleString()} pts`}
                    hint={pointsDollars > 0 ? `Worth up to ${money(pointsDollars)} (100 pts = $1). Your tier follows your balance.` : "Redeemable from 500 points."}
                    checked={redeemPoints}
                    disabled={pointsDollars <= 0}
                    onChange={setRedeemPoints}
                  />
                </div>
                <div className="mt-6">
                  <p className="mb-2 flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
                    <Tag aria-hidden width={12} height={12} /> Promo code
                  </p>
                  <div className="flex gap-2">
                    <Input
                      aria-label="Promo code"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="WELCOME10"
                      className="font-mono uppercase"
                    />
                    <Button type="button" variant="outline" onClick={applyPromo}>
                      Apply
                    </Button>
                  </div>
                  {promo ? (
                    <p className="mt-2 flex items-center justify-between text-xs text-success">
                      <span>{promo.code} — {promo.description}</span>
                      <button type="button" className="text-muted hover:text-danger" onClick={() => setPromo(null)}>Remove</button>
                    </p>
                  ) : promoError ? (
                    <p className="mt-2 text-xs text-danger">{promoError}</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-dim">Try WELCOME10 for 10% off your first booking.</p>
                  )}
                </div>
              </Card>
            </>
          ) : null}

          {step === 3 ? (
            <Card title="Review & confirm" icon={Check}>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Review label="Listing" value={listing.name} />
                <Review label="When" value={`${fmtWhen(window_.start)} · ${unitLabel(unit, qty)}`} />
                <Review label="Returns" value={fmtWhen(window_.end)} />
                <Review label="Insurance" value={insurance === "nxl" ? "NXL coverage" : `${carrier} · ${policy}`} />
                {isCar ? <Review label="Delivery" value={deliveryOn ? deliveryAddress : "Collect at the depot"} /> : null}
                {isCar ? <Review label="Collection" value={pickupOn ? pickupAddr : "Return to the depot"} /> : null}
                <Review
                  label="Paying with"
                  value={[
                    s.walletApplied > 0 ? `${money(s.walletApplied)} Drive Wallet` : null,
                    s.cardCharge > 0
                      ? payMethod === "cash"
                        ? `${money(s.cardCharge)} cash at pickup`
                        : useSavedCard && member.card ? cardLabel(member.card) : `Card ···· ${card.number.replace(/\D/g, "").slice(-4)}`
                      : null,
                  ].filter(Boolean).join(" + ") || "—"}
                />
                <Review label="Deposit" value={`${money(q.depositDue)} · ${depositTerms({ depositMethod })}`} />
              </dl>
              <label className="mt-6 flex items-start gap-3 rounded-lg border border-line bg-ink/40 p-4 text-sm text-cream/85">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 accent-[#c4a068]" />
                <span>
                  I agree to the <Link href="/terms" className="text-gold hover:underline">rental terms</Link> and understand the {money(q.depositDue)} deposit is
                  {depositMethod === "cash" ? " paid in cash" : " held on my card"} at pickup and returned after a clean return inspection.
                  {cashDue > 0 ? ` The ${money(cashDue)} rental balance is due in cash at pickup.` : ""}
                </span>
              </label>
            </Card>
          ) : null}

          {error ? <Alert tone="danger">{error}</Alert> : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => go(step - 1)}>
                <ArrowLeft aria-hidden width={16} height={16} /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button size="lg" onClick={() => go(step + 1)}>
                Continue to {STEPS[step + 1].toLowerCase()}
                <ArrowRight aria-hidden width={16} height={16} />
              </Button>
            ) : (
              <Button size="lg" onClick={confirm} disabled={placing}>
                {placing ? "Processing…" : cardDue > 0 ? `Confirm & pay ${money(cardDue)}` : "Confirm booking"}
                {!placing ? <Lock aria-hidden width={15} height={15} /> : null}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-dim">
            Demo checkout: no card is charged. The payment processor goes live at the final milestone.
          </p>
        </div>

        {/* ------------------------------ summary ------------------------------ */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="edge-gold overflow-hidden rounded-xl shadow-elev-2">
            <Media src={listing.photo} alt={listing.name} aspect="16/9" rounded={false} sizes="400px" />
            <div className="p-5">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-gold">{listing.category}</p>
              <p className="mt-1 font-display text-xl font-semibold text-cream">{listing.name}</p>
              <p className="mt-1 text-xs text-muted">
                {money(rateFor(listing, unit))}{unitSuffix(unit)} · {unitLabel(unit, qty)}
              </p>

              <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
                {s.lineItems.map((item) => (
                  <div key={item.key} className="flex items-baseline justify-between gap-4">
                    <dt className={cn("text-muted", item.kind === "credit" && "text-success")}>{item.label}</dt>
                    <dd className={cn("shrink-0 font-mono tabular-nums", item.kind === "info" ? "text-xs text-muted-dim" : item.kind === "credit" ? "text-success" : "text-cream")}>
                      {item.kind === "info" ? (item.note ?? money(item.amount)) : money(item.amount)}
                    </dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-semibold text-cream">Total</dt>
                  <dd className="font-mono tabular-nums text-cream">{money(s.total)}</dd>
                </div>
                {s.walletApplied > 0 ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted">Drive Wallet</dt>
                    <dd className="font-mono tabular-nums text-success">−{money(s.walletApplied)}</dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-semibold text-cream">Due today</dt>
                  <dd className="text-metal-soft font-mono text-lg font-semibold tabular-nums">{money(cardDue)}</dd>
                </div>
                {cashDue > 0 ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted">Cash at pickup</dt>
                    <dd className="font-mono tabular-nums text-cream">{money(cashDue)}</dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted">Deposit at pickup{depositMethod === "cash" ? " · cash" : ""}</dt>
                  <dd className="font-mono tabular-nums text-cream/70">{money(q.depositDue)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted">Points you&apos;ll earn</dt>
                  <dd className="font-mono tabular-nums text-gold">{member.enrolled ? `+${s.pointsEarned.toLocaleString()}` : "Join Level Rewards"}</dd>
                </div>
              </dl>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-dim">
            <CircleAlert aria-hidden width={13} height={13} className="mt-0.5 shrink-0" />
            Free cancellation up to 48 hours before pickup.
          </p>
        </aside>
      </div>
    </Container>
  );
}

/* --------------------------------- pieces --------------------------------- */

function Card({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ width?: number; height?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface-1/60 p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/40 text-gold">
          <Icon aria-hidden width={16} height={16} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-cream">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Choice({ selected, onClick, title, price, body }: { selected: boolean; onClick: () => void; title: string; price: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-xl p-4 text-left transition-colors",
        selected ? "edge-gold" : "border border-line bg-ink/40 hover:border-line-strong",
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium text-cream">{title}</span>
        <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", selected ? "border-gold bg-gold text-ink" : "border-line")}>
          {selected ? <Check aria-hidden width={12} height={12} /> : null}
        </span>
      </span>
      {price ? <span className="mt-1 block font-mono text-sm text-gold">{price}</span> : null}
      <span className="mt-2 block text-xs leading-relaxed text-muted">{body}</span>
    </button>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-cream">{label}</p>
        <p className="text-xs text-muted-dim">{hint}</p>
      </div>
      <Toggle label={label} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function AddressInput({ id, label, value, onChange, miles }: { id: string; label: string; value: string; onChange: (v: string) => void; miles?: number }) {
  const extra = miles !== undefined && miles > PRICING.delivery.baseMiles;
  return (
    <Field
      label={label}
      htmlFor={id}
      required
      hint={
        miles === undefined
          ? "Hotel, marina, airport or street address."
          : `${miles} mi from the depot · ${extra ? `${Math.round(miles - PRICING.delivery.baseMiles)} mi beyond the base zone` : "within the base zone"}`
      }
    >
      <Input id={id} list="nxl-places" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Faena Hotel, 3201 Collins Ave" />
    </Field>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink/40 px-4 py-3">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{label}</dt>
      <dd className="mt-1 text-cream">{value}</dd>
    </div>
  );
}

function Confirmation({ reservation: r, listing }: { reservation: Reservation; listing: Listing }) {
  // From the booking itself — the member's balance has already moved on.
  const balance = r.total - (r.walletApplied ?? 0);
  const cash = r.payment?.method === "cash";
  return (
    <Container className="pb-28 pt-28">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full metal-plate shadow-glow-gold">
          <Check aria-hidden width={28} height={28} />
        </span>
        <Eyebrow className="mt-8 justify-center">Reservation confirmed</Eyebrow>
        <h1 className="mt-4 font-display text-display-4 text-cream sm:text-display-3">You&apos;re set.</h1>
        <p className="mt-3 text-muted">
          {listing.name} · {unitLabel(r.unit, r.qty)} from {fmtWhen(r.window.start)}. A confirmation is on its way to {r.email}.
        </p>

        <dl className="mx-auto mt-10 grid max-w-xl gap-3 text-left sm:grid-cols-2">
          <Review label="Reference" value={r.reference} />
          <Review label={cash ? "Cash at pickup" : "Charged today"} value={money(balance)} />
          <Review label="Paid with" value={paidWith(r)} />
          <Review label="Deposit" value={`${money(r.deposit)} · ${depositTerms(r)}`} />
          <Review label="Points earned" value={r.pointsEarned ? `+${r.pointsEarned.toLocaleString()}` : "—"} />
          {r.deliveryAddress ? <Review label="Delivering to" value={r.deliveryAddress} /> : null}
          {r.partnerCode ? <Review label="Referred by" value={r.partnerCode} /> : null}
        </dl>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href={`/account/bookings/${r.id}`} size="lg">
            View booking
            <ArrowRight aria-hidden width={16} height={16} />
          </ButtonLink>
          <ButtonLink href="/account/rewards" variant="outline" size="lg">
            My rewards
          </ButtonLink>
          <ButtonLink href={listing.kind === "car" ? "/cars" : "/homes"} variant="ghost" size="lg">
            Keep browsing
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
