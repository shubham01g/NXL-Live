"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, ClipboardCheck, IdCard, LocateFixed, LocateOff, LogOut, MapPin, Navigation, Phone, Truck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/site/logo";
import { RouteMap } from "@/components/maps/route-map";
import { InspectionReport } from "@/components/admin/reservation-tools";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { Media } from "@/components/ui/media";
import { Badge, Eyebrow } from "@/components/ui/primitives";
import { StepIndicator, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { initials } from "@/lib/domain/account";
import { shortDate } from "@/lib/domain/format";
import { destinationFor } from "@/lib/domain/telemetry";
import type { Condition, Driver, DriverJobStatus, FuelLevel, Inspection, Reservation } from "@/lib/domain/operations";
import { LISTINGS } from "@/lib/data/fixtures/listings";
import { DRIVERS, RESERVATIONS } from "@/lib/data/fixtures/operations";
import { C, logAudit, notify, raiseAlert } from "@/lib/data/demo";
import { patch, readCollection, setValue, useCollection, useDemoReady, useDemoValue } from "@/lib/data/demo-store";
import { timestamp, useClock } from "@/lib/hooks/use-clock";

/**
 * The driver portal — the prototype's DriverPortal, which had no way in from
 * the UI. Built for a phone in one hand: big targets, one action per screen.
 *
 * The job moves assigned → en route → car collected → delivered, and the two
 * handovers each require a walk-around inspection first. Everything written
 * here shows up live on the member's booking page and the dispatch map.
 */

const SESSION = "driver-session";

const NEXT: Record<DriverJobStatus, { to: DriverJobStatus; label: string; inspect: Inspection["stage"] | null } | null> = {
  assigned: { to: "en_route", label: "Start — head to the depot", inspect: null },
  en_route: { to: "picked_up", label: "Inspect & collect the car", inspect: "pickup" },
  picked_up: { to: "delivered", label: "Inspect & hand over to guest", inspect: "delivery" },
  delivered: null,
};

const JOB_LABEL: Record<DriverJobStatus, string> = { assigned: "Assigned", en_route: "En route to depot", picked_up: "Car collected", delivered: "Delivered" };

function useDriver(): Driver | null {
  const drivers = useCollection<Driver>(C.drivers, DRIVERS);
  const id = useDemoValue<string | null>(SESSION, null);
  return drivers.find((d) => d.id === id) ?? null;
}

export function DriverPortal() {
  const ready = useDemoReady();
  const driver = useDriver();
  if (!ready) return <div aria-hidden className="skeleton m-4 h-96 rounded-xl" />;
  return driver ? <Signed driver={driver} /> : <DriverSignIn />;
}

/* --------------------------------- sign in -------------------------------- */

function DriverSignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto h-14" />
        <div className="mt-6 text-center">
          <Eyebrow className="justify-center">Driver portal</Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-semibold text-cream">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Your deliveries, routes and inspections.</p>
        </div>
        <form
          className="edge-gold mt-8 space-y-4 rounded-xl p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await new Promise((r) => setTimeout(r, 400));
            const d = readCollection<Driver>(C.drivers, DRIVERS).find((x) => x.username === username.trim().toLowerCase());
            setBusy(false);
            if (!d || d.password !== password) return setError("Invalid username or password. Contact your dispatcher.");
            setValue(SESSION, d.id);
            logAudit(d.name, "auth.driver_signed_in", d.name, `@${d.username}`);
            toast(`Good to see you, ${d.name.split(" ")[0]}.`);
          }}
        >
          <Field label="Username" htmlFor="dr-user"><Input id="dr-user" autoCapitalize="none" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="h-12" /></Field>
          <Field label="Password" htmlFor="dr-pass"><Input id="dr-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" /></Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          <p className="text-center text-xs text-muted-dim">
            Demo:{" "}
            <button type="button" className="font-mono text-gold hover:underline" onClick={() => { setUsername("marcushale"); setPassword("nxl2024"); }}>marcushale / nxl2024</button>
          </p>
        </form>
        <p className="mt-6 text-center text-xs text-muted-dim"><Link href="/" className="hover:text-gold">← nxlexoticrentals.com</Link></p>
      </div>
    </div>
  );
}

/* --------------------------------- signed --------------------------------- */

type Tab = "jobs" | "licence";

function Signed({ driver }: { driver: Driver }) {
  const reservations = useCollection<Reservation>(C.reservations, RESERVATIONS);
  const [tab, setTab] = useState<Tab>("jobs");
  const [openId, setOpenId] = useState<string | null>(null);
  const gps = useGps(driver, reservations);
  const now = useClock(60_000);

  const mine = reservations.filter((r) => r.driverId === driver.id && r.status !== "cancelled");
  const active = mine.filter((r) => r.driverJob !== "delivered" && r.status !== "completed").sort((a, b) => a.window.start - b.window.start);
  const startOfDay = new Date(now).setHours(0, 0, 0, 0);
  const doneToday = mine.filter((r) => r.driverJob === "delivered" && (r.inspections ?? []).some((i) => i.stage === "delivery" && i.at >= startOfDay)).length;
  const open = mine.find((r) => r.id === openId) ?? null;
  const licenceIssue = driver.license !== "verified" || !driver.licenseFront;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-28">
      <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-ink/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-ink" style={{ background: driver.color ?? "#c4a068" }}>{initials(driver.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-cream">{driver.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className={cn("h-1.5 w-1.5 rounded-full", gps.state === "on" ? "animate-live bg-success" : gps.state === "denied" ? "bg-danger" : "bg-muted-dim")} />
              {gps.state === "on" ? "Sharing location" : gps.state === "denied" ? "Location blocked" : "Location off"} · {doneToday} delivered today
            </p>
          </div>
          <button type="button" onClick={gps.toggle} aria-label={gps.state === "on" ? "Stop sharing location" : "Share location"} className={cn("grid h-10 w-10 place-items-center rounded-full border", gps.state === "on" ? "border-success/50 text-success" : "border-line text-muted")}>
            {gps.state === "on" ? <LocateFixed width={17} height={17} /> : <LocateOff width={17} height={17} />}
          </button>
          <button type="button" onClick={() => { setValue(SESSION, null); toast("Signed out."); }} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-gold">
            <LogOut width={16} height={16} />
          </button>
        </div>
        {!open ? (
          <Tabs<Tab>
            className="mt-3"
            label="Driver"
            value={tab}
            onChange={setTab}
            items={[
              { value: "jobs", label: "Jobs", count: active.length },
              { value: "licence", label: "Licence", flag: licenceIssue },
            ]}
          />
        ) : null}
      </header>

      <main className="px-4 pt-5">
        {gps.state === "denied" ? <Alert tone="warning" className="mb-4">Location is blocked. Dispatch sees an estimated position until you allow it in your browser settings.</Alert> : null}
        {driver.license !== "verified" && !open ? (
          <Alert tone="danger" className="mb-4" title="You can't be dispatched yet">{driver.licenseNote ?? "Your licence is waiting for review. Upload both sides on the Licence tab."}</Alert>
        ) : null}

        {open ? (
          <JobDetail r={open} driver={driver} onBack={() => setOpenId(null)} position={gps.position} />
        ) : tab === "jobs" ? (
          active.length ? (
            <ul className="space-y-3">
              {active.map((r) => {
                const listing = LISTINGS.find((l) => l.id === r.listingId);
                return (
                  <li key={r.id}>
                    <button type="button" onClick={() => setOpenId(r.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-1/60 p-3 text-left transition-colors hover:border-gold/40">
                      <Media src={listing?.photo} alt="" aspect="1/1" className="w-16 shrink-0" sizes="64px" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-cream">{r.listingName}</span>
                        <span className="block truncate text-xs text-muted">{r.guestName} · {new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(r.window.start))}</span>
                        <span className="mt-1 flex items-center gap-1 truncate text-xs text-cream/70"><MapPin aria-hidden width={11} height={11} className="shrink-0 text-gold" />{r.deliveryAddress ?? "Depot handover"}</span>
                      </span>
                      <span className="flex flex-col items-end gap-2">
                        <Badge tone={r.driverJob === "assigned" ? "neutral" : "gold"}>{JOB_LABEL[r.driverJob ?? "assigned"]}</Badge>
                        <ChevronRight aria-hidden width={16} height={16} className="text-muted" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="All clear" description="No deliveries assigned right now. Dispatch will send new jobs here." />
          )
        ) : (
          <LicenceTab driver={driver} />
        )}
      </main>
    </div>
  );
}

/* ----------------------------------- GPS ---------------------------------- */

function useGps(driver: Driver, reservations: Reservation[]) {
  const [state, setState] = useState<"off" | "on" | "denied">("off");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const latest = useRef({ driver, reservations });
  useEffect(() => {
    latest.current = { driver, reservations };
  });

  useEffect(() => {
    if (state !== "on") return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setState("denied"));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(point);
        const { driver: d, reservations: rs } = latest.current;
        patch<Driver>(C.drivers, d, { position: { ...point, at: Date.now() } });
        // The car moves with the driver once it's collected.
        const carrying = rs.find((r) => r.driverId === d.id && r.driverJob === "picked_up");
        if (carrying) patch<Reservation>(C.reservations, carrying, { carPosition: { ...point, at: Date.now(), source: "driver" } });
      },
      () => setState("denied"),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [state]);

  return { state, position, toggle: () => setState((s) => (s === "on" ? "off" : "on")) };
}

/* ------------------------------- job detail ------------------------------- */

function JobDetail({ r, driver, onBack, position }: { r: Reservation; driver: Driver; onBack: () => void; position: { lat: number; lng: number } | null }) {
  const [inspecting, setInspecting] = useState<Inspection["stage"] | null>(null);
  const job = r.driverJob ?? "assigned";
  const next = NEXT[job];
  const dest = destinationFor(r);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job === "assigned" || job === "en_route" ? "1200 Ocean Drive, Miami Beach, FL" : (r.deliveryAddress ?? `${dest.lat},${dest.lng}`))}`;
  const blocked = driver.license !== "verified";

  function advance(to: DriverJobStatus, inspection?: Inspection) {
    const change: Partial<Reservation> = { driverJob: to, inspections: inspection ? [...(r.inspections ?? []), inspection] : r.inspections };
    if (to === "delivered" && r.status === "confirmed") change.status = "checked_out";
    patch<Reservation>(C.reservations, r, change);
    patch<Driver>(C.drivers, driver, { status: to === "delivered" ? "available" : "on-delivery", deliveries: to === "delivered" ? driver.deliveries + 1 : driver.deliveries });
    logAudit(driver.name, `driver.${to}`, r.reference, JOB_LABEL[to]);
    const msg: Record<DriverJobStatus, [string, string] | null> = {
      assigned: null,
      en_route: ["Your driver is on the way", `${driver.name} is collecting the ${r.listingName} from our depot.`],
      picked_up: ["Your car is on its way", `${driver.name} has the ${r.listingName} and is heading to ${r.deliveryAddress ?? "you"}.`],
      delivered: ["Delivered — enjoy the drive", `The ${r.listingName} is with you. The deposit hold starts now.`],
    };
    const m = msg[to];
    if (m) notify({ email: r.email, kind: to === "delivered" ? "pickup" : "update", at: timestamp(), title: m[0], body: m[1], href: `/account/bookings/${r.id}` });
    if (inspection?.damage) raiseAlert("fleet", "Damage flagged at handover", `${driver.name} reported damage on the ${r.listingName} (${r.reference}).`);
    toast(JOB_LABEL[to]);
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
        <ArrowLeft aria-hidden width={14} height={14} /> All jobs
      </button>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">{JOB_LABEL[job]}</Badge>
          <span className="font-mono text-xs text-muted">{r.reference}</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold text-cream">{r.listingName}</h1>
        <p className="text-sm text-muted">Handover {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(r.window.start))} · back {shortDate(r.window.end)}</p>
      </div>

      <StepIndicator steps={["Assigned", "En route", "Collected", "Delivered"]} current={["assigned", "en_route", "picked_up", "delivered"].indexOf(job) + (job === "delivered" ? 1 : 0)} />

      <section className="rounded-xl border border-line bg-surface-1/60 p-4">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Guest</p>
        <p className="mt-1 text-lg text-cream">{r.guestName}</p>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-cream/80"><MapPin aria-hidden width={14} height={14} className="mt-0.5 shrink-0 text-gold" />{r.deliveryAddress ?? "Depot handover — 1200 Ocean Drive"}</p>
        {r.notes ? <p className="mt-2 rounded-md bg-ink/50 px-3 py-2 text-xs text-muted">“{r.notes}”</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`} className="flex h-12 items-center justify-center gap-2 rounded-full border border-line text-sm text-cream hover:border-gold/50"><Phone aria-hidden width={15} height={15} /> Call guest</a>
          <a href={directions} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full border border-gold/50 text-sm font-semibold text-gold hover:bg-gold/10"><Navigation aria-hidden width={15} height={15} /> Directions</a>
        </div>
      </section>

      <RouteMap job={r} driver={{ point: position ?? driver.position ?? null, initials: initials(driver.name), color: driver.color ?? "#c4a068" }} height={260} />

      {r.inspections?.length ? (
        <section className="space-y-3">
          {r.inspections.map((i) => <InspectionReport key={i.id} inspection={i} />)}
        </section>
      ) : null}

      {next ? (
        <div className="fixed inset-x-0 bottom-0 z-[var(--z-float)] border-t border-line bg-ink/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <Button size="lg" className="h-14 w-full" disabled={blocked} onClick={() => (next.inspect ? setInspecting(next.inspect) : advance(next.to))}>
              {next.inspect ? <ClipboardCheck aria-hidden width={18} height={18} /> : <Truck aria-hidden width={18} height={18} />}
              {next.label}
            </Button>
          </div>
        </div>
      ) : (
        <Alert tone="success" title="Delivered">Handed over. The job is complete — dispatch will assign the collection.</Alert>
      )}

      {inspecting ? (
        <InspectionWizard
          stage={inspecting}
          r={r}
          driver={driver}
          onCancel={() => setInspecting(null)}
          onDone={(inspection) => {
            setInspecting(null);
            if (next) advance(next.to, inspection);
          }}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------- inspection wizard --------------------------- */

const CHECKS = ["tyres", "lights", "windshield", "fluids", "documents", "charging cable"] as const;
const FUEL: FuelLevel[] = ["E", "1/4", "1/2", "3/4", "F"];
const SHOTS = ["Front", "Rear", "Driver side", "Passenger side"];

function InspectionWizard({ stage, r, driver, onCancel, onDone }: { stage: Inspection["stage"]; r: Reservation; driver: Driver; onCancel: () => void; onDone: (i: Inspection) => void }) {
  const isCar = r.listingKind === "car";
  const steps = isCar ? ["Checklist", "Condition", "Photos", "Sign off"] : ["Condition", "Photos", "Sign off"];
  const [step, setStep] = useState(0);
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState<FuelLevel>("F");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [exterior, setExterior] = useState<Condition>("clean");
  const [interior, setInterior] = useState<Condition>("clean");
  const [damage, setDamage] = useState("");
  const [hasDamage, setHasDamage] = useState(false);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const name = steps[step];

  function next() {
    setError(null);
    if (name === "Checklist") {
      if (!mileage) return setError("Enter the odometer reading.");
      if (CHECKS.some((c) => !checks[c])) return setError("Tick every safety check before continuing.");
    }
    if (name === "Condition" && hasDamage && damage.trim().length < 5) return setError("Describe the damage and where it is.");
    if (name === "Photos" && photos.filter(Boolean).length < 2) return setError("Take at least two photos.");
    setStep((s) => s + 1);
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-ink">
      <div className="border-b border-line px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-gold">{stage === "pickup" ? "Collection at depot" : "Handover to guest"}</p>
            <p className="font-display text-lg font-semibold text-cream">{r.listingName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
        <StepIndicator steps={steps} current={step} className="mx-auto mt-3 max-w-2xl" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-5">
          {name === "Checklist" ? (
            <>
              <Field label="Odometer (miles)" htmlFor="in-miles"><Input id="in-miles" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))} className="h-12 text-lg" /></Field>
              <div>
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Fuel / charge</p>
                <div className="grid grid-cols-5 gap-2">
                  {FUEL.map((f) => (
                    <button key={f} type="button" onClick={() => setFuel(f)} className={cn("h-12 rounded-lg border font-mono text-sm", fuel === f ? "border-gold bg-gold/10 text-gold" : "border-line text-cream/80")}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CHECKS.map((c) => (
                  <button key={c} type="button" onClick={() => setChecks({ ...checks, [c]: !checks[c] })} className={cn("flex h-14 items-center gap-3 rounded-lg border px-4 text-left text-sm capitalize", checks[c] ? "border-success/50 bg-success/10 text-success" : "border-line text-cream/85")}>
                    <span className={cn("grid h-6 w-6 place-items-center rounded-full border", checks[c] ? "border-success bg-success text-ink" : "border-line")}>{checks[c] ? <Check width={13} height={13} /> : null}</span>
                    {c}
                  </button>
                ))}
              </div>
            </>
          ) : name === "Condition" ? (
            <>
              {(["exterior", "interior"] as const).map((part) => (
                <div key={part}>
                  <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{part}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["clean", "minor", "major"] as Condition[]).map((c) => {
                      const selected = (part === "exterior" ? exterior : interior) === c;
                      return (
                        <button key={c} type="button" onClick={() => (part === "exterior" ? setExterior(c) : setInterior(c))} className={cn("h-12 rounded-lg border text-sm", selected ? (c === "clean" ? "border-success bg-success/10 text-success" : c === "minor" ? "border-warning bg-warning/10 text-warning" : "border-danger bg-danger/10 text-danger") : "border-line text-cream/80")}>
                          {c === "clean" ? "Clean" : c === "minor" ? "Minor scuffs" : "Major damage"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <label className="flex h-14 items-center justify-between rounded-lg border border-line px-4 text-sm text-cream">
                Damage to report?
                <input type="checkbox" checked={hasDamage} onChange={(e) => setHasDamage(e.target.checked)} className="h-5 w-5 accent-[#ff5566]" />
              </label>
              {hasDamage ? <Textarea rows={3} value={damage} onChange={(e) => setDamage(e.target.value)} placeholder="e.g. 3cm scratch, rear passenger door" /> : null}
            </>
          ) : name === "Photos" ? (
            <div className="grid grid-cols-2 gap-3">
              {SHOTS.map((s, i) => (
                <FileDrop key={s} label={s} capture="environment" accept="image/*" aspect="aspect-[4/3]" value={photos[i]} onChange={(v) => setPhotos(photos.map((p, n) => (n === i ? v : p)))} />
              ))}
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface-1/60 p-4 text-sm">
                {isCar ? <><dt className="text-muted">Odometer</dt><dd className="text-right text-cream">{Number(mileage).toLocaleString()} mi</dd><dt className="text-muted">Fuel</dt><dd className="text-right text-cream">{fuel}</dd></> : null}
                <dt className="text-muted">Exterior</dt><dd className="text-right capitalize text-cream">{exterior}</dd>
                <dt className="text-muted">Interior</dt><dd className="text-right capitalize text-cream">{interior}</dd>
                <dt className="text-muted">Photos</dt><dd className="text-right text-cream">{photos.filter(Boolean).length}</dd>
              </dl>
              {hasDamage ? <Alert tone="danger" title="Damage flagged">Dispatch and the guest are notified when you submit.</Alert> : null}
              <Field label="Notes (optional)" htmlFor="in-notes"><Textarea id="in-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              <p className="text-xs text-muted-dim">By submitting you confirm this inspection was done in person by {driver.name}.</p>
            </>
          )}
          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>
      </div>
      <div className="border-t border-line p-4">
        <div className="mx-auto flex max-w-2xl gap-3">
          {step > 0 ? <Button variant="outline" size="lg" className="h-14 flex-1" onClick={() => setStep((s) => s - 1)}>Back</Button> : null}
          {step < steps.length - 1 ? (
            <Button size="lg" className="h-14 flex-[2]" onClick={next}>Continue</Button>
          ) : (
            <Button
              size="lg"
              className="h-14 flex-[2]"
              onClick={() =>
                onDone({
                  id: `insp-${timestamp().toString(36)}`,
                  stage,
                  at: timestamp(),
                  by: driver.name,
                  mileage: mileage ? Number(mileage) : null,
                  fuel: isCar ? fuel : null,
                  exterior,
                  interior,
                  damage: hasDamage ? damage.trim() : null,
                  checklist: isCar ? Object.fromEntries(CHECKS.map((c) => [c, !!checks[c]])) : {},
                  photos: photos.filter((p): p is string => !!p),
                  notes: notes.trim() || null,
                })
              }
            >
              Submit inspection
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- licence -------------------------------- */

function LicenceTab({ driver }: { driver: Driver }) {
  const [front, setFront] = useState<string | null>(driver.licenseFront ?? null);
  const [back, setBack] = useState<string | null>(driver.licenseBack ?? null);
  const tone = driver.license === "verified" ? "success" : driver.license === "expired" ? "danger" : "warning";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-1/60 p-4">
        <div className="flex items-center gap-3">
          <IdCard aria-hidden width={20} height={20} className="text-gold" />
          <div>
            <p className="text-sm text-cream">Driver&apos;s licence</p>
            <p className="text-xs text-muted">{driver.licenseExpiry ? `Expires ${shortDate(driver.licenseExpiry)}` : "No expiry on file"}</p>
          </div>
        </div>
        <Badge tone={tone}>{driver.license === "verified" ? "Approved" : driver.license === "expired" ? "Expired" : "Under review"}</Badge>
      </div>
      {driver.licenseNote ? <Alert tone={tone === "success" ? "info" : "warning"} title="From dispatch">{driver.licenseNote}</Alert> : null}
      <div className="grid grid-cols-2 gap-3">
        <FileDrop label="Front" capture="environment" accept="image/*" value={front} onChange={setFront} />
        <FileDrop label="Back" capture="environment" accept="image/*" value={back} onChange={setBack} />
      </div>
      <Button
        size="lg"
        className="h-14 w-full"
        disabled={!front || !back || (front === driver.licenseFront && back === driver.licenseBack)}
        onClick={() => {
          patch<Driver>(C.drivers, driver, { licenseFront: front, licenseBack: back, license: "pending", licenseNote: null });
          raiseAlert("fleet", "Driver licence uploaded", `${driver.name} uploaded a licence for review.`);
          logAudit(driver.name, "driver.licence_uploaded", driver.name, "Front and back");
          toast("Sent for review — dispatch will approve it shortly.");
        }}
      >
        Submit for review
      </Button>
    </div>
  );
}
