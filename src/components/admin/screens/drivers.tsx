"use client";

import { useState } from "react";
import { IdCard, Pencil, Phone, Plus, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/account/avatar";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Modal } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { count, shortDate } from "@/lib/domain/format";
import type { Driver, LicenseStatus, Reservation } from "@/lib/domain/operations";
import { C, logAudit } from "@/lib/data/demo";
import { create, newId, patch, remove, useCollection } from "@/lib/data/demo-store";
import { DriverMap } from "@/components/maps/driver-map";
import { DeliveryMap } from "@/components/maps/delivery-map";
import { PIN_COLORS } from "@/components/maps/leaflet";
import { DemoNote, PageHeader } from "../ui";
import { Status } from "../status";
import { assignDriver, useActor } from "../reservation-tools";

/**
 * Drivers — roster, live dispatch map, licence review and the delivery
 * queue. The prototype's DriversPanel, split into tabs. A driver with an
 * unverified licence can't be dispatched; only a Master Admin can verify one.
 */

type Tab = "roster" | "map" | "licences" | "queue";

const JOB_LABEL = { assigned: "Assigned", en_route: "En route", picked_up: "Car collected", delivered: "Delivered" } as const;

export function DriversScreen({ initial, reservations: baseReservations }: { initial: Driver[]; reservations: Reservation[] }) {
  const drivers = useCollection<Driver>(C.drivers, initial);
  const reservations = useCollection<Reservation>(C.reservations, baseReservations);
  const actor = useActor();
  const [tab, setTab] = useState<Tab>("roster");
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [reviewing, setReviewing] = useState<Driver | null>(null);

  const openJobs = (id: string) =>
    reservations.filter((r) => r.driverId === id && r.status !== "completed" && r.status !== "cancelled" && r.driverJob !== "delivered");
  const unassigned = reservations.filter(
    (r) => r.listingKind === "car" && r.deliveryAddress && !r.driverId && (r.status === "pending" || r.status === "confirmed"),
  );
  const pendingLicences = drivers.filter((d) => d.license !== "verified").length;
  const dispatchable = drivers.filter((d) => d.license === "verified");

  const setDuty = (d: Driver, onDuty: boolean) => {
    patch<Driver>(C.drivers, d, { status: onDuty ? "available" : "off-duty" });
    toast(`${d.name} is now ${onDuty ? "on duty" : "off duty"}.`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Drivers"
        description="Who's on duty, where they are, what they're delivering, and whose licence needs attention."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden width={16} height={16} /> Add driver
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "On the roster", value: drivers.length },
          { label: "On duty", value: drivers.filter((d) => d.status !== "off-duty").length },
          { label: "Unassigned deliveries", value: unassigned.length },
          { label: "Licence issues", value: pendingLicences },
        ]}
      />

      <Tabs<Tab>
        label="Drivers"
        value={tab}
        onChange={setTab}
        items={[
          { value: "roster", label: "Roster", count: drivers.length },
          { value: "map", label: "Live map" },
          { value: "queue", label: "Delivery queue", count: unassigned.length },
          { value: "licences", label: "Licences", flag: pendingLicences > 0 },
        ]}
      />

      {tab === "roster" ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {drivers.map((d, i) => {
            const jobs = openJobs(d.id);
            const canWork = d.license === "verified";
            return (
              <li key={d.id} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1/50 p-5">
                <div className="flex items-start gap-3">
                  <span className="relative">
                    <Avatar name={d.name} photo={null} size="sm" />
                    <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface-1" style={{ background: d.color ?? PIN_COLORS[i % PIN_COLORS.length] }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-cream">{d.name}</p>
                    <p className="truncate text-xs text-muted">
                      {d.zone}
                      {d.username ? ` · @${d.username}` : ""}
                    </p>
                  </div>
                  <Status kind="driver" value={d.status} />
                </div>

                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Rating</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-cream">
                      <Star aria-hidden width={13} height={13} className="fill-gold text-gold" />
                      {d.rating ? d.rating.toFixed(2) : "New"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Runs</dt>
                    <dd className="mt-1 text-cream">{count(d.deliveries)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Vehicle</dt>
                    <dd className="mt-1 truncate text-xs text-cream">{d.vehicle?.replace("Chase car · ", "") ?? "—"}</dd>
                  </div>
                </dl>

                <div className="min-h-10 space-y-1.5 rounded-lg bg-ink/40 px-3 py-2.5 text-xs text-cream/75">
                  {jobs.length ? (
                    jobs.map((job) => (
                      <p key={job.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          <span className="text-gold">{job.reference}</span> · {job.listingName} → {job.deliveryAddress ?? "depot"}
                        </span>
                        <span className="shrink-0 text-muted">{JOB_LABEL[job.driverJob ?? "assigned"]}</span>
                      </p>
                    ))
                  ) : (
                    "No active assignment"
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <Status kind="license" value={d.license} />
                  <div className="flex items-center gap-2">
                    <a href={`tel:${d.phone.replace(/[^+\d]/g, "")}`} aria-label={`Call ${d.name}`} className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition-colors hover:border-gold/40 hover:text-gold">
                      <Phone width={14} height={14} />
                    </a>
                    <button type="button" onClick={() => setEditing(d)} aria-label={`Edit ${d.name}`} className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition-colors hover:border-gold/40 hover:text-gold">
                      <Pencil width={13} height={13} />
                    </button>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      On duty
                      <Toggle label={`${d.name} on duty`} checked={d.status !== "off-duty"} disabled={!canWork || d.status === "on-delivery"} onChange={(on) => setDuty(d, on)} />
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : tab === "map" ? (
        <DriverMap drivers={drivers} reservations={reservations} />
      ) : tab === "queue" ? (
        <div className="space-y-6">
          {unassigned.length ? (
            <ul className="space-y-2">
              {unassigned.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-1/50 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-cream">
                      {r.listingName} → {r.deliveryAddress}
                    </p>
                    <p className="text-xs text-muted">
                      {r.reference} · {r.guestName} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(new Date(r.window.start))}
                    </p>
                  </div>
                  <Select
                    aria-label={`Assign a driver to ${r.reference}`}
                    value=""
                    onChange={(e) => {
                      const d = drivers.find((x) => x.id === e.target.value);
                      if (d) {
                        assignDriver(r, d, actor.name);
                        toast(`${d.name} assigned to ${r.reference}.`);
                      }
                    }}
                    className="h-10 max-w-56 py-2"
                  >
                    <option value="">Assign driver…</option>
                    {dispatchable.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} · {d.status === "off-duty" ? "off duty" : d.zone}</option>
                    ))}
                  </Select>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Every delivery has a driver" description="New web and concierge bookings with a delivery address land here until someone is assigned." />
          )}
          <DeliveryMap reservations={reservations} height={380} />
        </div>
      ) : (
        <>
          {!actor.isMaster ? <Alert tone="info">Only a Master Admin can approve or reject a licence. You can see the queue and remind the driver.</Alert> : null}
          <ul className="grid gap-4 lg:grid-cols-2">
            {drivers.map((d) => (
              <li key={d.id} className="rounded-xl border border-line bg-surface-1/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-cream">{d.name}</p>
                    <p className="text-xs text-muted">{d.licenseExpiry ? `Expires ${shortDate(d.licenseExpiry)}` : "No expiry on file"}</p>
                  </div>
                  <Status kind="license" value={d.license} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[d.licenseFront, d.licenseBack].map((img, n) =>
                    img ? (
                      // Uploaded from the driver portal as a data URL.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={n} src={img} alt={`${d.name} licence ${n ? "back" : "front"}`} className="aspect-[16/10] w-full rounded-lg border border-line object-cover" />
                    ) : (
                      <div key={n} className="grid aspect-[16/10] place-items-center rounded-lg border border-dashed border-line text-center text-xs text-muted-dim">
                        <span>
                          <IdCard aria-hidden width={18} height={18} className="mx-auto mb-1 text-muted" />
                          {n ? "Back" : "Front"} — {d.license === "verified" ? "on file" : "not uploaded"}
                        </span>
                      </div>
                    ),
                  )}
                </div>
                {d.licenseNote ? <p className="mt-3 text-xs text-warning">{d.licenseNote}</p> : null}
                {actor.isMaster ? (
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setReviewing(d)}>
                    {d.license === "verified" ? "Re-review licence" : "Review licence"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <DemoNote />

      <DriverEditor key={`edit-${editing === "new" ? "new" : (editing?.id ?? "none")}`} driver={editing} onClose={() => setEditing(null)} actor={actor.name} canRemove={actor.isMaster} />
      <LicenceReview key={`review-${reviewing?.id ?? "none"}`} driver={reviewing} onClose={() => setReviewing(null)} actor={actor.name} />
    </div>
  );
}

function DriverEditor({ driver, onClose, actor, canRemove }: { driver: Driver | "new" | null; onClose: () => void; actor: string; canRemove: boolean }) {
  const existing = driver && driver !== "new" ? driver : null;
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    phone: existing?.phone ?? "",
    zone: existing?.zone ?? "South Beach",
    username: existing?.username ?? "",
    password: "",
    vehicle: existing?.vehicle ?? "",
    color: existing?.color ?? PIN_COLORS[1],
  });
  const [error, setError] = useState<string | null>(null);
  if (!driver) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function save() {
    if (form.name.trim().length < 2) return setError("Enter the driver's name.");
    if (!/^[a-z0-9._]{3,}$/.test(form.username)) return setError("Username: at least 3 lowercase letters or numbers.");
    if (!existing && form.password.length < 6) return setError("Set a password of at least 6 characters.");
    const base = {
      name: form.name.trim(),
      phone: form.phone.trim() || "—",
      zone: form.zone.trim() || "South Beach",
      username: form.username,
      vehicle: form.vehicle.trim() || undefined,
      color: form.color,
      ...(form.password ? { password: form.password } : {}),
    };
    if (existing) {
      patch<Driver>(C.drivers, existing, base);
      logAudit(actor, "driver.updated", base.name, "Profile edited");
      toast(`${base.name} updated.`);
    } else {
      create<Driver>(C.drivers, { id: newId("drv"), status: "off-duty", license: "pending", rating: 0, deliveries: 0, licenseFront: null, licenseBack: null, ...base, password: form.password });
      logAudit(actor, "driver.added", base.name, `@${base.username}`);
      toast(`${base.name} added — they can sign in to the driver portal as @${base.username}.`);
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : "Add a driver"}
      description="Drivers sign in to the driver portal with this username and password."
      footer={
        <>
          {existing && canRemove ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:text-danger"
              onClick={() => {
                remove(C.drivers, existing.id);
                logAudit(actor, "driver.removed", existing.name, "Removed from roster");
                toast(`${existing.name} removed from the roster.`);
                onClose();
              }}
            >
              <Trash2 aria-hidden width={14} height={14} /> Remove
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{existing ? "Save" : "Add to roster"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="de-name" required><Input id="de-name" value={form.name} onChange={set("name")} /></Field>
        <Field label="Phone" htmlFor="de-phone"><Input id="de-phone" type="tel" value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Username" htmlFor="de-user" required><Input id="de-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })} /></Field>
        <Field label="Password" htmlFor="de-pass" hint={existing ? "Leave blank to keep the current one." : undefined} required={!existing}><Input id="de-pass" type="password" value={form.password} onChange={set("password")} /></Field>
        <Field label="Home zone" htmlFor="de-zone"><Input id="de-zone" value={form.zone} onChange={set("zone")} /></Field>
        <Field label="Vehicle" htmlFor="de-veh"><Input id="de-veh" value={form.vehicle} onChange={set("vehicle")} placeholder="Chase car · Tesla Model Y" /></Field>
        <div className="sm:col-span-2">
          <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Map pin colour</p>
          <div className="flex flex-wrap gap-2">
            {PIN_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setForm({ ...form, color: c })} className={cn("h-8 w-8 rounded-full ring-offset-2 ring-offset-surface-1", form.color === c && "ring-2 ring-cream")} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
    </Modal>
  );
}

function LicenceReview({ driver, onClose, actor }: { driver: Driver | null; onClose: () => void; actor: string }) {
  const [note, setNote] = useState(driver?.licenseNote ?? "");
  if (!driver) return null;
  const decide = (status: LicenseStatus, label: string) => {
    patch<Driver>(C.drivers, driver, { license: status, licenseNote: note.trim() || null, status: status === "verified" ? driver.status : "off-duty" });
    logAudit(actor, "driver.licence_reviewed", driver.name, `${label}${note ? ` — ${note}` : ""}`);
    toast(`${driver.name}'s licence: ${label.toLowerCase()}.`);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Review ${driver.name}'s licence`}
      description="Approving puts the driver back in the dispatch list. Rejecting or expiring takes them off duty."
      footer={
        <>
          <Button variant="ghost" onClick={() => decide("expired", "Marked expired")}>Expired</Button>
          <Button variant="outline" className="border-danger/50 text-danger hover:border-danger hover:bg-danger/10" onClick={() => decide("pending", "Rejected — needs a new upload")}>Reject</Button>
          <Button onClick={() => decide("verified", "Approved")}>Approve</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {[driver.licenseFront, driver.licenseBack].map((img, n) =>
          img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={n} src={img} alt={`Licence ${n ? "back" : "front"}`} className="aspect-[16/10] w-full rounded-lg border border-line object-cover" />
          ) : (
            <div key={n} className="grid aspect-[16/10] place-items-center rounded-lg border border-dashed border-line text-xs text-muted-dim">{n ? "Back" : "Front"} not uploaded</div>
          ),
        )}
      </div>
      <Field label="Note to driver" htmlFor="lr-note" className="mt-4">
        <Textarea id="lr-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown in the driver portal, e.g. 'Photo is blurry — please rescan.'" />
      </Field>
    </Modal>
  );
}
