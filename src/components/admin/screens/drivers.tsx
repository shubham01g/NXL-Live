"use client";

import { useState } from "react";
import { Phone, Plus, Star } from "lucide-react";
import { Avatar } from "@/components/account/avatar";
import { Panel, SavedNote } from "@/components/account/panel";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { count } from "@/lib/domain/format";
import type { Driver, Reservation } from "@/lib/domain/operations";
import { DemoNote, PageHeader } from "../ui";
import { Status } from "../status";

/**
 * Driver roster and dispatch state. Cards rather than a table: an employee
 * scans this to answer "who can I send?", and the answer is a face, a zone
 * and a green badge. A driver with an unverified licence can't go on duty.
 */
export function DriversScreen({ initial, reservations }: { initial: Driver[]; reservations: Reservation[] }) {
  const [drivers, setDrivers] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", zone: "South Beach" });
  const [note, setNote] = useState<string | null>(null);

  const assignment = (id: string) =>
    reservations.find(
      (r) => r.driverId === id && (r.status === "confirmed" || r.status === "checked_out"),
    );

  const setDuty = (d: Driver, onDuty: boolean) => {
    setDrivers((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, status: onDuty ? "available" : "off-duty" } : x)),
    );
    setNote(`${d.name} is now ${onDuty ? "on duty" : "off duty"}.`);
  };

  function add() {
    if (!form.name.trim()) return;
    setDrivers((prev) => [
      ...prev,
      {
        id: `drv-new-${Date.now()}`,
        name: form.name.trim(),
        phone: form.phone.trim() || "—",
        zone: form.zone.trim() || "South Beach",
        status: "off-duty",
        license: "pending",
        rating: 0,
        deliveries: 0,
      },
    ]);
    setNote(`${form.name.trim()} added — licence goes to review before their first dispatch.`);
    setForm({ name: "", phone: "", zone: "South Beach" });
    setAdding(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Drivers"
        description="Who's on duty, who's out on a delivery, and whose licence needs attention."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden width={16} height={16} />
            Add driver
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "On the roster", value: drivers.length },
          { label: "Available", value: drivers.filter((d) => d.status === "available").length },
          { label: "On delivery", value: drivers.filter((d) => d.status === "on-delivery").length },
          { label: "Licence issues", value: drivers.filter((d) => d.license !== "verified").length },
        ]}
      />

      {adding ? (
        <Panel tone="gold" title="Add a driver">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="grid gap-4 sm:grid-cols-3"
          >
            <Field label="Full name" htmlFor="d-name" required>
              <Input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Phone" htmlFor="d-phone">
              <Input id="d-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Home zone" htmlFor="d-zone">
              <Input id="d-zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
            </Field>
            <div className="flex gap-3 sm:col-span-3">
              <Button type="submit">Add to roster</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {note ? <SavedNote>{note}</SavedNote> : null}

      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {drivers.map((d) => {
          const job = assignment(d.id);
          const canWork = d.license === "verified";
          return (
            <li key={d.id} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1/50 p-5">
              <div className="flex items-start gap-3">
                <Avatar name={d.name} photo={null} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-cream">{d.name}</p>
                  <p className="text-xs text-muted">{d.zone}</p>
                </div>
                <Status kind="driver" value={d.status} />
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Rating</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-cream">
                    <Star aria-hidden width={13} height={13} className="fill-gold text-gold" />
                    {d.rating ? d.rating.toFixed(2) : "New"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Deliveries</dt>
                  <dd className="mt-1 text-cream">{count(d.deliveries)}</dd>
                </div>
              </dl>

              <p className="min-h-10 rounded-lg bg-ink/40 px-3 py-2.5 text-xs text-cream/75">
                {job ? (
                  <>
                    <span className="text-gold">{job.reference}</span> · {job.listingName}
                    {job.deliveryAddress ? ` → ${job.deliveryAddress}` : ""}
                  </>
                ) : (
                  "No active assignment"
                )}
              </p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Status kind="license" value={d.license} />
                <div className="flex items-center gap-3">
                  <a
                    href={`tel:${d.phone.replace(/[^+\d]/g, "")}`}
                    aria-label={`Call ${d.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    <Phone width={14} height={14} />
                  </a>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    On duty
                    <Toggle
                      label={`${d.name} on duty`}
                      checked={d.status !== "off-duty"}
                      disabled={!canWork || d.status === "on-delivery"}
                      onChange={(on) => setDuty(d, on)}
                    />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <DemoNote />
    </div>
  );
}
