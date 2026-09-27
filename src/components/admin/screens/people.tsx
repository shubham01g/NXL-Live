"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Pencil, Plus, Trash2, Wand2, X } from "lucide-react";
import { Avatar } from "@/components/account/avatar";
import { Panel } from "@/components/account/panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { count, money, relativeTime, shortDate } from "@/lib/domain/format";
import type { PartnerStatus } from "@/lib/domain/types";
import { PARTNER_TYPES } from "@/lib/data/fixtures/catalog";
import { STAFF_ROLE_LABEL, type Partner, type Reservation, type StaffMember, type StaffRole } from "@/lib/domain/operations";
import { useStaff } from "@/lib/auth/staff-session";
import { C, logAudit } from "@/lib/data/demo";
import { create, newId, patch, remove, useCollection } from "@/lib/data/demo-store";
import { balanceOf, codeFor, DEFAULT_COMMISSION, partnerLedger, payPartner } from "@/lib/data/partners";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput } from "../ui";
import { useActor } from "../reservation-tools";

/* --------------------------------- partners -------------------------------- */

export function PartnersScreen({ initial, reservations: baseReservations }: { initial: Partner[]; reservations: Reservation[] }) {
  const partners = useCollection<Partner>(C.partners, initial);
  const reservations = useCollection<Reservation>(C.reservations, baseReservations);
  const actor = useActor();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partner | "new" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const pending = partners.filter((p) => p.status === "pending");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return partners.filter((p) => p.status !== "pending" && (!q || `${p.business} ${p.contact} ${p.type} ${p.code} ${p.email}`.toLowerCase().includes(q)));
  }, [partners, query]);

  const setStatus = (p: Partner, status: PartnerStatus, message: string) => {
    patch<Partner>(C.partners, p, { status });
    logAudit(actor.name, `partner.${status === "active" ? "approved" : status}`, p.business, message);
    toast(message);
  };
  const owed = partners.reduce((s, p) => s + balanceOf(p), 0);
  const open = partners.find((p) => p.id === openId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Partners"
        description="Hotels, charters and concierges that refer guests — their codes, commission and earnings."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden width={16} height={16} /> Onboard partner
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "Active partners", value: partners.filter((p) => p.status === "active").length },
          { label: "Guests referred", value: count(partners.reduce((s, p) => s + p.referrals, 0)) },
          { label: "Commission earned", value: money(partners.reduce((s, p) => s + p.earnings, 0)) },
          { label: "Owed, unpaid", value: money(owed) },
        ]}
      />

      {pending.length ? (
        <Panel title="Applications awaiting review" description="Approve to issue their referral code.">
          <ul className="divide-y divide-line">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-3.5">
                <Primary title={p.business} sub={`${p.type} · ${p.contact} · applied ${relativeTime(p.joinedAt)}`} />
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      remove(C.partners, p.id);
                      logAudit(actor.name, "partner.declined", p.business, "Application declined");
                      toast(`${p.business}'s application declined.`);
                    }}
                  >
                    <X aria-hidden width={14} height={14} /> Decline
                  </Button>
                  <Button size="sm" onClick={() => setStatus(p, "active", `${p.business} approved — code ${p.code} is live.`)}>
                    <Check aria-hidden width={14} height={14} /> Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <SearchInput value={query} onChange={setQuery} label="Search partners" placeholder="Business, contact, type or code…" />

      <DataTable
        caption="Partners"
        rows={rows}
        rowKey={(p) => p.id}
        empty="No partners match."
        onRowClick={(p) => setOpenId(p.id)}
        columns={[
          { key: "biz", header: "Partner", cell: (p) => <Primary title={p.business} sub={`${p.contact} · ${p.type}`} /> },
          { key: "code", header: "Code", cell: (p) => <span className="font-mono text-xs tracking-wider text-gold">{p.code}</span> },
          { key: "comm", header: "Commission", align: "right", hideBelow: "md", cell: (p) => `${p.commission}%` },
          { key: "refs", header: "Referrals", align: "right", hideBelow: "sm", cell: (p) => p.referrals },
          { key: "earned", header: "Earned", align: "right", hideBelow: "md", cell: (p) => money(p.earnings) },
          { key: "owed", header: "Owed", align: "right", cell: (p) => money(balanceOf(p)) },
          {
            key: "status",
            header: "Status",
            cell: (p) => (
              <InlineSelect<PartnerStatus>
                label={`Status of ${p.business}`}
                value={p.status}
                options={[
                  { value: "active", label: "Active" },
                  { value: "paused", label: "Paused" },
                ]}
                onChange={(s) => setStatus(p, s, `${p.business} ${s === "active" ? "reactivated" : "paused"}.`)}
              />
            ),
          },
        ]}
      />
      <DemoNote />

      {open ? (
        <PartnerDrawer
          p={open}
          reservations={reservations}
          canPay={actor.isMaster || actor.role === "admin"}
          canDelete={actor.isMaster}
          onEdit={() => setEditing(open)}
          onClose={() => setOpenId(null)}
          actor={actor.name}
        />
      ) : null}
      <PartnerEditor key={editing === "new" ? "new" : (editing?.id ?? "none")} partner={editing} taken={partners.map((p) => p.code)} onClose={() => setEditing(null)} actor={actor.name} />
    </div>
  );
}

function PartnerDrawer({
  p,
  reservations,
  canPay,
  canDelete,
  onEdit,
  onClose,
  actor,
}: {
  p: Partner;
  reservations: Reservation[];
  canPay: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onClose: () => void;
  actor: string;
}) {
  const ledger = partnerLedger(p, reservations);
  const balance = balanceOf(p);
  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      eyebrow={`${p.type} · joined ${shortDate(p.joinedAt)}`}
      title={p.business}
      description={`${p.contact} · ${p.email}${p.phone ? ` · ${p.phone}` : ""}`}
      footer={
        <>
          {canDelete ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:text-danger"
              onClick={() => {
                remove(C.partners, p.id);
                logAudit(actor, "partner.removed", p.business, "Partner removed");
                toast(`${p.business} removed.`);
                onClose();
              }}
            >
              <Trash2 aria-hidden width={14} height={14} /> Remove
            </Button>
          ) : null}
          <Button variant="outline" onClick={onEdit}>
            <Pencil aria-hidden width={14} height={14} /> Edit
          </Button>
          {canPay ? (
            <Button
              disabled={balance <= 0}
              onClick={() => {
                const po = payPartner(p, actor);
                if (po) toast(`${money(po.amount)} paid to ${p.business}.`);
              }}
            >
              Pay {money(balance)}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Code", p.code],
          ["Commission", `${p.commission}%`],
          ["Unpaid", money(balance)],
          ["Lifetime paid", money(p.paidOut)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-ink/40 px-4 py-3">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{k}</p>
            <p className="mt-1 font-mono text-cream">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        Referral link <span className="font-mono text-gold">nxlexoticrentals.com/?ref={p.code}</span>
        <ButtonLink href={`/partner?code=${p.code}`} size="sm" variant="ghost" className="px-2">
          Open their portal <ExternalLink aria-hidden width={12} height={12} />
        </ButtonLink>
      </p>
      <p className="mb-2 mt-6 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Referral ledger · last {ledger.length}</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2/60 text-left font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
              <th className="px-3 py-2 font-normal">Guest</th>
              <th className="px-3 py-2 font-normal">Booking</th>
              <th className="px-3 py-2 text-right font-normal">Rental</th>
              <th className="px-3 py-2 text-right font-normal">Commission</th>
              <th className="px-3 py-2 text-right font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2.5 text-cream">{r.guest}<span className="block text-xs text-muted-dim">{shortDate(r.at)}</span></td>
                <td className="px-3 py-2.5 text-cream/80">{r.listingName}<span className="block font-mono text-xs text-muted-dim">{r.reference}</span></td>
                <td className="px-3 py-2.5 text-right font-mono text-cream/80">{money(r.amount)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-gold">{money(r.commission)}</td>
                <td className="px-3 py-2.5 text-right">
                  <Badge tone={r.status === "paid" ? "success" : r.status === "cleared" ? "gold" : "warning"}>{r.status === "cleared" ? "Ready to pay" : r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}

function PartnerEditor({ partner, taken, onClose, actor }: { partner: Partner | "new" | null; taken: string[]; onClose: () => void; actor: string }) {
  const existing = partner && partner !== "new" ? partner : null;
  const [form, setForm] = useState({
    business: existing?.business ?? "",
    contact: existing?.contact ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    type: existing?.type ?? (PARTNER_TYPES[0] as string),
    code: existing?.code ?? "",
    commission: String(existing?.commission ?? DEFAULT_COMMISSION),
    status: existing?.status ?? ("active" as PartnerStatus),
  });
  const [error, setError] = useState<string | null>(null);
  if (!partner) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  function save() {
    if (form.business.trim().length < 2) return setError("Enter the business name.");
    const code = (form.code || codeFor(form.business, taken)).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (taken.includes(code) && code !== existing?.code) return setError("That code is taken.");
    const fields = { business: form.business.trim(), contact: form.contact.trim(), email: form.email.trim(), phone: form.phone.trim(), type: form.type, code, commission: Number(form.commission) || DEFAULT_COMMISSION, status: form.status };
    if (existing) {
      patch<Partner>(C.partners, existing, fields);
      logAudit(actor, "partner.updated", fields.business, `Code ${code} · ${fields.commission}%`);
      toast(`${fields.business} updated.`);
    } else {
      create<Partner>(C.partners, { id: newId("ptn"), referrals: 0, earnings: 0, paidOut: 0, joinedAt: Date.now(), ...fields });
      logAudit(actor, "partner.onboarded", fields.business, `Code ${code} · ${fields.commission}%`);
      toast(`${fields.business} onboarded — code ${code} is live.`);
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.business}` : "Onboard a partner"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{existing ? "Save" : "Onboard"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business" htmlFor="pe-biz" required className="sm:col-span-2"><Input id="pe-biz" value={form.business} onChange={set("business")} /></Field>
        <Field label="Contact" htmlFor="pe-contact"><Input id="pe-contact" value={form.contact} onChange={set("contact")} /></Field>
        <Field label="Email" htmlFor="pe-email"><Input id="pe-email" type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Phone" htmlFor="pe-phone"><Input id="pe-phone" value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Type" htmlFor="pe-type">
          <Select id="pe-type" value={form.type} onChange={set("type")}>
            {PARTNER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Referral code" htmlFor="pe-code">
          <div className="flex gap-2">
            <Input id="pe-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono uppercase" placeholder="Auto" />
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, code: codeFor(form.business || "PARTNER", taken) })} aria-label="Generate code">
              <Wand2 aria-hidden width={14} height={14} />
            </Button>
          </div>
        </Field>
        <Field label="Commission %" htmlFor="pe-comm"><Input id="pe-comm" type="number" min={0} max={30} value={form.commission} onChange={set("commission")} /></Field>
        <Field label="Status" htmlFor="pe-status">
          <Select id="pe-status" value={form.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="pending">Pending review</option>
            <option value="paused">Paused</option>
          </Select>
        </Field>
      </div>
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
    </Modal>
  );
}

/* ----------------------------------- team ---------------------------------- */

const ROLE_OPTIONS = (["employee", "admin", "master"] as StaffRole[]).map((value) => ({ value, label: STAFF_ROLE_LABEL[value] }));

export function TeamScreen({ initial }: { initial: StaffMember[] }) {
  const session = useStaff();
  const me = session.status === "signed-in" ? session.staff : null;
  const canAssignRoles = me?.role === "master";
  const team = useCollection<StaffMember>(C.staff, initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", title: "", role: "employee" as StaffRole });

  const update = (m: StaffMember, change: Partial<StaffMember>, message: string) => {
    patch<StaffMember>(C.staff, m, change);
    logAudit(me?.name ?? "Staff", "staff.updated", m.name, message);
    toast(message);
  };

  function add() {
    if (!form.name.trim() || !/\S+@\S+\.\S+/.test(form.email)) return;
    create<StaffMember>(C.staff, {
      id: newId("st"),
      name: form.name.trim(),
      email: form.email.trim(),
      title: form.title.trim() || STAFF_ROLE_LABEL[form.role],
      role: form.role,
      active: true,
      addedAt: Date.now(),
      lastActiveAt: Date.now(),
    });
    logAudit(me?.name ?? "Staff", "staff.added", form.name.trim(), `Role: ${form.role}`);
    toast(`${form.name.trim()} added as ${STAFF_ROLE_LABEL[form.role]}. They'll get an invite once email is connected.`);
    setForm({ name: "", email: "", title: "", role: "employee" });
    setAdding(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Team"
        description="Staff accounts and what each one can reach. Employees run operations; admins add people; Master Admin sees everything."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden width={16} height={16} /> Add team member
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {ROLE_OPTIONS.map((r) => (
          <div key={r.value} className="rounded-xl border border-line bg-surface-1/50 p-4">
            <p className="flex items-center justify-between font-medium text-cream">
              {r.label} <span className="font-mono text-xs text-muted">{team.filter((m) => m.role === r.value).length}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {r.value === "employee" ? "Fleet, estates, reservations, drivers." : r.value === "admin" ? "Adds customers, partners and team." : "Everything, including revenue and settings."}
            </p>
          </div>
        ))}
      </div>

      <DataTable
        caption="Team"
        rows={team}
        rowKey={(m) => m.id}
        columns={[
          {
            key: "name",
            header: "Member",
            cell: (m) => (
              <div className="flex items-center gap-3">
                <Avatar name={m.name} photo={null} size="xs" />
                <Primary title={m.name} sub={m.email} />
              </div>
            ),
          },
          { key: "title", header: "Title", hideBelow: "md", cell: (m) => m.title },
          {
            key: "role",
            header: "Role",
            cell: (m) =>
              canAssignRoles && m.id !== me?.id ? (
                <InlineSelect<StaffRole> label={`Role for ${m.name}`} value={m.role} options={ROLE_OPTIONS} onChange={(role) => update(m, { role }, `${m.name} is now ${STAFF_ROLE_LABEL[role]}.`)} />
              ) : (
                <Badge tone={m.role === "master" ? "gold" : "neutral"}>{STAFF_ROLE_LABEL[m.role]}</Badge>
              ),
          },
          { key: "seen", header: "Last active", hideBelow: "lg", cell: (m) => relativeTime(m.lastActiveAt) },
          {
            key: "active",
            header: "Access",
            align: "right",
            cell: (m) => (
              <div className="flex items-center justify-end gap-2">
                <Toggle label={`${m.name} has access`} checked={m.active} disabled={m.id === me?.id} onChange={(active) => update(m, { active }, `${m.name}'s access ${active ? "restored" : "suspended"}.`)} />
                {canAssignRoles && m.id !== me?.id && m.role !== "master" ? (
                  <button
                    type="button"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => {
                      remove(C.staff, m.id);
                      logAudit(me?.name ?? "Staff", "staff.removed", m.name, "Removed from team");
                      toast(`${m.name} removed.`);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-danger"
                  >
                    <Trash2 width={14} height={14} />
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      <DemoNote />

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a team member"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={add}>Add member</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="t-name" required><Input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Work email" htmlFor="t-email" required><Input id="t-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Title" htmlFor="t-title"><Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Role" htmlFor="t-role" hint={canAssignRoles ? undefined : "Only a Master Admin can assign roles."}>
            <Select id="t-role" value={form.role} disabled={!canAssignRoles} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
