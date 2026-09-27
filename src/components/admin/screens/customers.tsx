"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, KeyRound, MessageSquare, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/account/avatar";
import { TierChip } from "@/components/account/tier-chip";
import { CardFields } from "@/components/checkout/card-fields";
import { LiveRentalMap } from "@/components/maps/live-rental-map";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { count, money, relativeTime, shortDate } from "@/lib/domain/format";
import { cardLabel, EMPTY_CARD, parseCard, type CardInput } from "@/lib/domain/account";
import { TIERS, tierFor } from "@/lib/domain/loyalty";
import type { Listing, MemberAccount, TierName } from "@/lib/domain/types";
import type { AuditEntry, Customer, Driver, Partner, Reservation } from "@/lib/domain/operations";
import { AUDIT_LOG, C, logAudit, notify, queueMessage, updateReservation } from "@/lib/data/demo";
import { patch, readCollection, useCollection } from "@/lib/data/demo-store";
import { timestamp } from "@/lib/hooks/use-clock";
import { DataTable, DemoNote, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { Status } from "../status";
import { NewReservationModal, useActor } from "../reservation-tools";

/**
 * Customers — the prototype's UsersPanel and CustomerDetailModal.
 *
 * The drawer is the one place staff see a member whole: card, address,
 * licence and insurance (verified by a Master Admin), wallet and points,
 * deposits on open bookings, live GPS for a car that is out, and the account
 * history. Edits also reach the member's own account when they have one.
 */

const tierOf = (name: TierName) => TIERS.find((t) => t.name === name)!;
const CHANNEL_LABEL = { web: "Website", "walk-in": "Walk-in", referral: "Referral", concierge: "Concierge" } as const;

/** Mirror a change onto the member's own account, if they have signed up here. */
function syncMember(email: string, change: (m: MemberAccount) => MemberAccount) {
  const member = readCollection<MemberAccount>(C.members, []).find((m) => m.email === email);
  if (member) patch<MemberAccount>(C.members, member, change(member));
}

export function CustomersScreen({
  initial,
  reservations: baseReservations,
  listings,
  drivers,
  partners,
}: {
  initial: Customer[];
  reservations: Reservation[];
  listings: Listing[];
  drivers: Driver[];
  partners: Partner[];
}) {
  const customers = useCollection<Customer>(C.customers, initial);
  const reservations = useCollection<Reservation>(C.reservations, baseReservations);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"all" | TierName>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [booking, setBooking] = useState<Customer | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter(
      (c) => (tier === "all" || c.tier === tier) && (!q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)),
    );
  }, [customers, query, tier]);
  const open = customers.find((c) => c.id === openId) ?? null;
  const liveEmails = new Set(reservations.filter((r) => r.status === "checked_out" || r.status === "active").map((r) => r.email));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="People" title="Customers" description="Every member: tier, points, wallet balance and lifetime value. Open a row for the full profile." />

      <StatGrid
        stats={[
          { label: "Customers", value: customers.length },
          { label: "Rewards members", value: customers.filter((c) => c.enrolled).length },
          { label: "Wallet credit held", value: money(customers.reduce((s, c) => s + c.credits, 0)) },
          { label: "Lifetime spend", value: money(customers.reduce((s, c) => s + c.lifetimeSpend, 0)) },
        ]}
      />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} label="Search customers" placeholder="Name, email or phone…" />
        <SegmentedControl<"all" | TierName>
          label="Filter by tier"
          size="sm"
          value={tier}
          onChange={setTier}
          options={[{ value: "all", label: "All tiers" }, ...TIERS.map((t) => ({ value: t.name, label: t.name }))]}
          className="w-full sm:w-auto"
        />
      </Toolbar>

      <DataTable
        caption="Customers"
        rows={rows}
        rowKey={(c) => c.id}
        empty="No customers match."
        onRowClick={(c) => setOpenId(c.id)}
        columns={[
          {
            key: "name",
            header: "Customer",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <Avatar name={c.name} photo={null} size="xs" />
                <Primary title={c.name} sub={c.email} />
                {liveEmails.has(c.email) ? <Badge tone="success">On trip</Badge> : null}
              </div>
            ),
          },
          { key: "tier", header: "Tier", cell: (c) => <TierChip tier={tierOf(c.tier)} /> },
          { key: "channel", header: "Channel", hideBelow: "xl", cell: (c) => <span className="text-xs text-muted">{CHANNEL_LABEL[c.channel ?? "web"]}{c.referredBy ? ` · ${c.referredBy}` : ""}</span> },
          { key: "points", header: "Points", align: "right", hideBelow: "md", cell: (c) => count(c.points) },
          { key: "wallet", header: "Wallet", align: "right", hideBelow: "sm", cell: (c) => money(c.credits) },
          { key: "rentals", header: "Rentals", align: "right", hideBelow: "lg", cell: (c) => c.rentals },
          { key: "spend", header: "Lifetime", align: "right", hideBelow: "md", cell: (c) => money(c.lifetimeSpend) },
          {
            key: "actions",
            header: "",
            align: "right",
            cell: (c) => (
              <div className="flex items-center justify-end gap-2">
                {c.suspended ? <Badge tone="danger">Suspended</Badge> : c.flagged ? <Badge tone="warning">Flagged</Badge> : null}
                <button type="button" onClick={() => setBooking(c)} className="whitespace-nowrap rounded-full border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10">
                  + Book
                </button>
              </div>
            ),
          },
        ]}
      />
      <DemoNote />

      {open ? (
        <CustomerDrawer
          key={open.id}
          c={open}
          reservations={reservations.filter((r) => r.email === open.email)}
          partners={partners}
          onClose={() => setOpenId(null)}
          onBook={() => setBooking(open)}
        />
      ) : null}
      <NewReservationModal key={booking?.id ?? "none"} open={!!booking} onClose={() => setBooking(null)} listings={listings} drivers={drivers} guest={booking} />
    </div>
  );
}

type DrawerTab = "overview" | "bookings" | "activity";

function CustomerDrawer({
  c,
  reservations,
  partners,
  onClose,
  onBook,
}: {
  c: Customer;
  reservations: Reservation[];
  partners: Partner[];
  onClose: () => void;
  onBook: () => void;
}) {
  const actor = useActor();
  const audit = useCollection<AuditEntry>(C.audit, AUDIT_LOG);
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [editing, setEditing] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [adjust, setAdjust] = useState<"credits" | "points" | null>(null);
  const member = readCollection<MemberAccount>(C.members, []).find((m) => m.email === c.email) ?? null;
  const licence = member?.licence ?? null;
  const live = reservations.filter((r) => r.status === "checked_out" || r.status === "active");
  const openDeposits = reservations.filter((r) => r.status !== "cancelled" && r.status !== "completed");
  const tier = tierFor(c.points);
  const history = audit.filter((a) => a.entity === c.email || a.entity === c.name || a.detail.includes(c.name));

  const update = (change: Partial<Customer>, action: string, detail: string) => {
    patch<Customer>(C.customers, c, change);
    logAudit(actor.name, action, c.email, detail);
  };

  const sendOtp = (channel: "email" | "sms") => {
    queueMessage({ to: channel === "email" ? c.email : c.phone, channel, subject: "Your NXL one-time code", template: "One-time passcode" });
    logAudit(actor.name, "auth.otp_sent", c.email, `OTP via ${channel}`);
    toast(`One-time code queued by ${channel === "sms" ? "SMS" : "email"} to ${c.name}.`, "info");
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      eyebrow={`${CHANNEL_LABEL[c.channel ?? "web"]} · joined ${shortDate(c.joinedAt)}`}
      title={c.name}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <TierChip tier={tier} points={c.points} />
          {live.length ? <Badge tone="success">Active rental</Badge> : null}
          {c.suspended ? <Badge tone="danger">Suspended</Badge> : null}
          <span className="text-xs">{c.email} · {c.phone}</span>
        </span>
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => sendOtp("email")}><KeyRound aria-hidden width={14} height={14} /> OTP email</Button>
          <Button variant="ghost" size="sm" onClick={() => sendOtp("sms")}><MessageSquare aria-hidden width={14} height={14} /> OTP SMS</Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil aria-hidden width={14} height={14} /> Edit</Button>
          <Button size="sm" onClick={onBook}><CalendarPlus aria-hidden width={14} height={14} /> New booking</Button>
        </>
      }
    >
      <Tabs<DrawerTab>
        label="Customer"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "bookings", label: "Bookings", count: reservations.length },
          { value: "activity", label: "Activity", count: history.length },
        ]}
      />

      {tab === "overview" ? (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Points" value={count(c.points)} action={actor.isMaster ? () => setAdjust("points") : undefined} />
            <Stat label="Drive Wallet" value={money(c.credits)} action={actor.isMaster ? () => setAdjust("credits") : undefined} />
            <Stat label="Lifetime" value={money(c.lifetimeSpend)} sub={`${c.rentals} rentals`} />
          </div>

          <Block title="Payment card" action={<Button size="sm" variant="ghost" onClick={() => setCardOpen(true)}>{c.card ? "Update" : "Add card"}</Button>}>
            {c.card ? <p className="text-sm text-cream">{cardLabel(c.card)} · exp {String(c.card.expMonth).padStart(2, "0")}/{String(c.card.expYear).slice(-2)} · {c.card.holder}</p> : <p className="text-sm text-muted">No card on file.</p>}
          </Block>

          <Block title="Billing & delivery address">
            {c.address ? (
              <p className="text-sm text-cream">
                {c.address.line1}
                {c.address.line2 ? `, ${c.address.line2}` : ""}, {c.address.city}, {c.address.state} {c.address.zip}
              </p>
            ) : (
              <p className="text-sm text-muted">No address on file.</p>
            )}
          </Block>

          <Block
            title="Driver's licence"
            action={
              actor.isMaster && (c.license || licence) ? (
                <span className="flex items-center gap-2 text-xs text-muted">
                  Verified
                  <Toggle
                    label="Licence verified"
                    checked={licence ? licence.status === "verified" : !!c.license?.verified}
                    onChange={(on) => {
                      if (c.license) update({ license: { ...c.license, verified: on } }, "member.licence_reviewed", on ? "Licence verified" : "Licence unverified");
                      syncMember(c.email, (m) => (m.licence ? { ...m, licence: { ...m.licence, status: on ? "verified" : "pending" } } : m));
                      if (!c.license) logAudit(actor.name, "member.licence_reviewed", c.email, on ? "Licence verified" : "Licence unverified");
                      notify({ email: c.email, kind: "update", at: timestamp(), title: on ? "Licence verified" : "Licence needs attention", body: on ? "You're cleared for delivery on every booking." : "Please re-upload your licence from the Insurance page.", href: "/account/insurance" });
                      toast(on ? "Licence verified." : "Licence marked for re-upload.");
                    }}
                  />
                </span>
              ) : null
            }
          >
            {licence ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[licence.front, licence.back].map((img, n) =>
                    img ? (
                      // Member upload, stored as a data URL at M2.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={n} src={img} alt={`Licence ${n ? "back" : "front"}`} className="aspect-[16/10] w-full rounded-md border border-line object-cover" />
                    ) : null,
                  )}
                </div>
                <p className="text-sm text-cream">{licence.state} · {licence.number} · expires {shortDate(licence.expiresAt)} · <span className="capitalize">{licence.status}</span></p>
              </div>
            ) : c.license ? (
              <p className="text-sm text-cream">{c.license.state} · {c.license.number} · expires {shortDate(c.license.expiresAt)} · {c.license.verified ? "verified" : "pending review"}</p>
            ) : (
              <p className="text-sm text-muted">No licence uploaded yet.</p>
            )}
          </Block>

          <Block
            title="Insurance"
            action={
              actor.isMaster && c.insurance && !c.insurance.verified ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    update({ insurance: { ...c.insurance!, verified: true } }, "member.insurance_verified", c.insurance!.carrier ?? "NXL");
                    syncMember(c.email, (m) => (m.insurance ? { ...m, insurance: { ...m.insurance, verified: true } } : m));
                    toast("Insurance verified.");
                  }}
                >
                  Verify & approve
                </Button>
              ) : null
            }
          >
            {c.insurance ? (
              <p className="text-sm text-cream">
                {c.insurance.kind === "nxl" ? "NXL coverage ($49/day at checkout)" : `${c.insurance.carrier} · ${c.insurance.policyNumber}`}{" "}
                {c.insurance.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Pending review</Badge>}
              </p>
            ) : (
              <p className="text-sm text-muted">No insurance on file.</p>
            )}
          </Block>

          <Block title="Deposits on open bookings">
            {openDeposits.length ? (
              <ul className="divide-y divide-line">
                {openDeposits.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-cream">{r.reference} · {r.listingName}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">{money(r.deposit)} {r.depositStatus}</span>
                      {actor.isMaster && r.depositStatus === "held" ? (
                        <>
                          <button type="button" className="text-xs text-gold hover:underline" onClick={() => { updateReservation(r, { depositStatus: "charged" }, actor.name, "deposit.charged", "Charged to card"); toast("Deposit charged to card."); }}>
                            Charge card
                          </button>
                          {c.credits >= r.deposit ? (
                            <button type="button" className="text-xs text-gold hover:underline" onClick={() => {
                              updateReservation(r, { depositStatus: "charged" }, actor.name, "deposit.charged", "Deducted from Drive Wallet");
                              update({ credits: c.credits - r.deposit }, "wallet.deducted", `${money(r.deposit)} deposit`);
                              syncMember(c.email, (m) => ({ ...m, credits: m.credits - r.deposit }));
                              toast("Deposit taken from the wallet.");
                            }}>
                              From wallet
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      {actor.isMaster && r.depositStatus === "charged" ? (
                        <>
                          <button type="button" className="text-xs text-success hover:underline" onClick={() => { updateReservation(r, { depositStatus: "refunded" }, actor.name, "deposit.refunded", "Refunded"); toast("Deposit refunded."); }}>Refund</button>
                          <button type="button" className="text-xs text-danger hover:underline" onClick={() => { updateReservation(r, { depositStatus: "forfeited" }, actor.name, "deposit.forfeited", "Forfeited"); toast("Deposit forfeited.", "warning"); }}>Forfeit</button>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No open bookings.</p>
            )}
          </Block>

          <Block title="Staff notes">
            <Textarea rows={3} defaultValue={c.notes ?? ""} onBlur={(e) => e.target.value !== (c.notes ?? "") && update({ notes: e.target.value }, "member.notes", "Notes updated")} placeholder="Preferences, VIP details, anything the next person should know." />
          </Block>

          {actor.isMaster ? (
            <div className="flex flex-wrap gap-2 border-t border-line pt-5">
              <Button size="sm" variant="ghost" onClick={() => { update({ flagged: !c.flagged }, "member.flagged", c.flagged ? "Flag cleared" : "Flagged for review"); toast(c.flagged ? "Flag cleared." : "Customer flagged."); }}>
                {c.flagged ? "Clear flag" : "Flag for review"}
              </Button>
              <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => { update({ suspended: !c.suspended }, "member.suspended", c.suspended ? "Reinstated" : "Suspended"); toast(c.suspended ? "Account reinstated." : "Account suspended.", "warning"); }}>
                {c.suspended ? "Reinstate account" : "Suspend account"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : tab === "bookings" ? (
        <div className="mt-6 space-y-4">
          {live.filter((r) => r.listingKind === "car").map((r) => (
            <div key={r.id}>
              <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Live GPS · {r.listingName}</p>
              <LiveRentalMap reservation={r} height={260} />
            </div>
          ))}
          {reservations.length ? (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {reservations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-cream">{r.listingName}</p>
                    <p className="text-xs text-muted">{r.reference} · {shortDate(r.window.start)} · {r.qty} {r.unit}{r.qty > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-cream">{money(r.total)}</span>
                    <Status kind="booking" value={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No bookings yet" action={<Button size="sm" onClick={onBook}>Book for {c.name.split(" ")[0]}</Button>} />
          )}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {history.length ? (
            history.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-ink/40 px-4 py-3 text-sm">
                <p className="text-cream">{a.detail}</p>
                <p className="mt-0.5 text-xs text-muted">{a.action} · {a.actor} · {relativeTime(a.at)}</p>
              </li>
            ))
          ) : (
            <EmptyState title="No account events yet" description="Sign-ins, verifications and changes by staff appear here." />
          )}
        </ul>
      )}

      <EditModal open={editing} c={c} partners={partners} onClose={() => setEditing(false)} onSave={(change) => update(change, "member.updated", "Profile edited")} />
      <CardModal open={cardOpen} c={c} onClose={() => setCardOpen(false)} onSave={(card) => { update({ card }, "member.card_updated", `Card ···· ${card.last4}`); syncMember(c.email, (m) => ({ ...m, card })); }} />
      <AdjustModal kind={adjust} c={c} onClose={() => setAdjust(null)} onSave={(delta, reason) => {
        if (adjust === "credits") {
          update({ credits: Math.max(0, c.credits + delta) }, "wallet.adjusted", `${delta > 0 ? "+" : ""}${money(delta)} · ${reason}`);
          syncMember(c.email, (m) => ({ ...m, credits: Math.max(0, m.credits + delta), creditsLoaded: m.creditsLoaded + Math.max(0, delta), wallet: [...m.wallet, { id: `w-adj-${timestamp()}`, kind: delta > 0 ? "bonus" : "spend", label: `Adjustment · ${reason}`, amount: delta, balanceAfter: Math.max(0, m.credits + delta), createdAt: timestamp() }] }));
        } else {
          update({ points: Math.max(0, c.points + delta), tier: tierFor(Math.max(0, c.points + delta)).name }, "points.adjusted", `${delta > 0 ? "+" : ""}${delta} pts · ${reason}`);
          syncMember(c.email, (m) => ({ ...m, points: Math.max(0, m.points + delta) }));
        }
        notify({ email: c.email, kind: "update", at: timestamp(), title: adjust === "credits" ? "Drive Wallet adjusted" : "Points adjusted", body: `${delta > 0 ? "+" : ""}${adjust === "credits" ? money(delta) : `${delta} pts`} — ${reason}`, href: adjust === "credits" ? "/account/wallet" : "/account/rewards" });
        toast("Adjustment saved.");
      }} />
    </Drawer>
  );
}

function Stat({ label, value, sub, action }: { label: string; value: string; sub?: string; action?: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-ink/40 px-4 py-3">
      <p className="flex items-center justify-between font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
        {label}
        {action ? <button type="button" onClick={action} className="normal-case tracking-normal text-gold hover:underline">Adjust</button> : null}
      </p>
      <p className="mt-1 font-mono text-lg tabular-nums text-cream">{value}</p>
      {sub ? <p className="text-xs text-muted-dim">{sub}</p> : null}
    </div>
  );
}

function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface-2/30 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function EditModal({ open, c, partners, onClose, onSave }: { open: boolean; c: Customer; partners: Partner[]; onClose: () => void; onSave: (change: Partial<Customer>) => void }) {
  const [form, setForm] = useState({ name: c.name, email: c.email, phone: c.phone, channel: c.channel ?? "web", referredBy: c.referredBy ?? "", enrolled: c.enrolled });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${c.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave({ ...form, referredBy: form.referredBy || null }); toast("Customer updated."); onClose(); }}>Save</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="ce-name"><Input id="ce-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email" htmlFor="ce-email"><Input id="ce-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="ce-phone"><Input id="ce-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Channel" htmlFor="ce-channel">
          <Select id="ce-channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Customer["channel"] & string })}>
            {Object.entries(CHANNEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Referred by" htmlFor="ce-ref" className="sm:col-span-2">
          <Select id="ce-ref" value={form.referredBy} onChange={(e) => setForm({ ...form, referredBy: e.target.value })}>
            <option value="">Nobody</option>
            {partners.map((p) => <option key={p.id} value={p.code}>{p.business} ({p.code})</option>)}
          </Select>
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-md border border-line bg-ink/40 p-3 text-sm text-cream sm:col-span-2">
          Level Rewards enrolled
          <Toggle label="Enrolled" checked={form.enrolled} onChange={(v) => setForm({ ...form, enrolled: v })} />
        </label>
      </div>
    </Modal>
  );
}

function CardModal({ open, c, onClose, onSave }: { open: boolean; c: Customer; onClose: () => void; onSave: (card: NonNullable<Customer["card"]>) => void }) {
  const [card, setCard] = useState<CardInput>({ ...EMPTY_CARD, holder: c.name });
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Card on file"
      description="Taken over the phone by the concierge. Only the brand, last four and expiry are kept."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { const res = parseCard(card); if (!res.ok) return setError(res.error); onSave(res.card); toast("Card saved."); onClose(); }}>Save card</Button>
        </>
      }
    >
      <CardFields value={card} onChange={setCard} />
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
    </Modal>
  );
}

function AdjustModal({ kind, c, onClose, onSave }: { kind: "credits" | "points" | null; c: Customer; onClose: () => void; onSave: (delta: number, reason: string) => void }) {
  const [sign, setSign] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  if (!kind) return null;
  const delta = (sign === "add" ? 1 : -1) * (Number(amount) || 0);
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={kind === "credits" ? "Adjust Drive Wallet" : "Adjust points"}
      description={`Current: ${kind === "credits" ? money(c.credits) : `${count(c.points)} pts`}. Every adjustment is audited.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!delta || reason.trim().length < 3} onClick={() => { onSave(delta, reason.trim()); onClose(); }}>Save adjustment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <SegmentedControl<"add" | "remove"> label="Direction" value={sign} onChange={setSign} options={[{ value: "add", label: kind === "credits" ? "Add credit" : "Add points" }, { value: "remove", label: "Remove" }]} />
        <Input aria-label="Amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={kind === "credits" ? "Amount in $" : "Points"} />
        <Input aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. goodwill for late delivery)" />
        <p className={cn("text-sm", delta >= 0 ? "text-success" : "text-danger")}>
          New {kind === "credits" ? "balance" : "points"}: {kind === "credits" ? money(Math.max(0, c.credits + delta)) : count(Math.max(0, c.points + delta))}
        </p>
      </div>
    </Modal>
  );
}
