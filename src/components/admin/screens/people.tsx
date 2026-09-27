"use client";

import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Avatar } from "@/components/account/avatar";
import { Panel, SavedNote } from "@/components/account/panel";
import { TierChip } from "@/components/account/tier-chip";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Field, Input, Select } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Badge } from "@/components/ui/primitives";
import { count, money, relativeTime, shortDate } from "@/lib/domain/format";
import { TIERS } from "@/lib/domain/loyalty";
import type { PartnerStatus, TierName } from "@/lib/domain/types";
import { PARTNER_TYPES } from "@/lib/data/fixtures/catalog";
import {
  STAFF_ROLE_LABEL,
  type Customer,
  type Partner,
  type StaffMember,
  type StaffRole,
} from "@/lib/domain/operations";
import { useStaff } from "@/lib/auth/staff-session";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput, Toolbar } from "../ui";

const tierOf = (name: TierName) => TIERS.find((t) => t.name === name)!;

/* -------------------------------- customers ------------------------------- */

export function CustomersScreen({ initial }: { initial: Customer[] }) {
  const [customers, setCustomers] = useState(initial);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"all" | TierName>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter(
      (c) =>
        (tier === "all" || c.tier === tier) &&
        (!q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)),
    );
  }, [customers, query, tier]);

  const toggleFlag = (id: string) =>
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, flagged: !c.flagged } : c)));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Customers"
        description="Every member: tier, points, wallet balance and lifetime value."
      />

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
        columns={[
          {
            key: "name",
            header: "Customer",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <Avatar name={c.name} photo={null} size="xs" />
                <Primary title={c.name} sub={c.email} />
              </div>
            ),
          },
          { key: "tier", header: "Tier", cell: (c) => <TierChip tier={tierOf(c.tier)} /> },
          { key: "points", header: "Points", align: "right", hideBelow: "md", cell: (c) => count(c.points) },
          { key: "wallet", header: "Wallet", align: "right", hideBelow: "sm", cell: (c) => money(c.credits) },
          { key: "rentals", header: "Rentals", align: "right", hideBelow: "lg", cell: (c) => c.rentals },
          { key: "spend", header: "Lifetime", align: "right", hideBelow: "md", cell: (c) => money(c.lifetimeSpend) },
          { key: "joined", header: "Joined", hideBelow: "lg", cell: (c) => shortDate(c.joinedAt) },
          {
            key: "flag",
            header: "",
            align: "right",
            cell: (c) => (
              <div className="flex items-center justify-end gap-2">
                {c.flagged ? <Badge tone="danger">Flagged</Badge> : null}
                <button
                  type="button"
                  onClick={() => toggleFlag(c.id)}
                  className="rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
                >
                  {c.flagged ? "Clear flag" : "Flag"}
                </button>
              </div>
            ),
          },
        ]}
      />
      <DemoNote />
    </div>
  );
}

/* --------------------------------- partners -------------------------------- */

export function PartnersScreen({ initial }: { initial: Partner[] }) {
  const [partners, setPartners] = useState(initial);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({ business: "", contact: "", email: "", type: PARTNER_TYPES[0] as string, commission: "8" });

  const pending = partners.filter((p) => p.status === "pending");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return partners.filter(
      (p) => p.status !== "pending" && (!q || `${p.business} ${p.contact} ${p.type} ${p.code}`.toLowerCase().includes(q)),
    );
  }, [partners, query]);

  const setStatus = (p: Partner, status: PartnerStatus, message: string) => {
    setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    setNote(message);
  };
  const decline = (p: Partner) => {
    setPartners((prev) => prev.filter((x) => x.id !== p.id));
    setNote(`${p.business}'s application declined.`);
  };

  function onboard() {
    if (!form.business.trim()) return;
    const code = form.business.replace(/[^a-z]/gi, "").slice(0, 7).toUpperCase() || "PARTNER";
    setPartners((prev) => [
      {
        id: `ptn-new-${Date.now()}`,
        business: form.business.trim(),
        contact: form.contact.trim(),
        email: form.email.trim(),
        phone: "",
        type: form.type,
        status: "active",
        code,
        commission: Number(form.commission) || 8,
        referrals: 0,
        earnings: 0,
        paidOut: 0,
        joinedAt: Date.now(),
      },
      ...prev,
    ]);
    setNote(`${form.business.trim()} onboarded with code ${code}.`);
    setAdding(false);
  }

  const owed = partners.reduce((s, p) => s + (p.earnings - p.paidOut), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Partners"
        description="Hotels, charters and concierges that refer guests — their codes, commission and earnings."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden width={16} height={16} />
            Onboard partner
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

      {adding ? (
        <Panel tone="gold" title="Onboard a partner">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onboard();
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <Field label="Business" htmlFor="p-biz" required className="lg:col-span-2">
              <Input id="p-biz" value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} required />
            </Field>
            <Field label="Contact" htmlFor="p-contact">
              <Input id="p-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="p-email">
              <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Commission %" htmlFor="p-comm">
              <Input id="p-comm" type="number" min={0} max={30} value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
            </Field>
            <Field label="Type" htmlFor="p-type" className="sm:col-span-2">
              <Select id="p-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {PARTNER_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
              <Button type="submit">Onboard</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {note ? <SavedNote>{note}</SavedNote> : null}

      {pending.length ? (
        <Panel title="Applications awaiting review" description="Approve to issue their referral code.">
          <ul className="divide-y divide-line">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-3.5">
                <Primary title={p.business} sub={`${p.type} · ${p.contact} · applied ${relativeTime(p.joinedAt)}`} />
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => decline(p)}>
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
        columns={[
          { key: "biz", header: "Partner", cell: (p) => <Primary title={p.business} sub={`${p.contact} · ${p.type}`} /> },
          {
            key: "code",
            header: "Code",
            cell: (p) => <span className="font-mono text-xs tracking-wider text-gold">{p.code}</span>,
          },
          { key: "comm", header: "Commission", align: "right", hideBelow: "md", cell: (p) => `${p.commission}%` },
          { key: "refs", header: "Referrals", align: "right", hideBelow: "sm", cell: (p) => p.referrals },
          { key: "earned", header: "Earned", align: "right", hideBelow: "md", cell: (p) => money(p.earnings) },
          { key: "owed", header: "Owed", align: "right", cell: (p) => money(p.earnings - p.paidOut) },
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
    </div>
  );
}

/* ----------------------------------- team ---------------------------------- */

const ROLE_OPTIONS = (["employee", "admin", "master"] as StaffRole[]).map((value) => ({
  value,
  label: STAFF_ROLE_LABEL[value],
}));

export function TeamScreen({ initial }: { initial: StaffMember[] }) {
  const session = useStaff();
  const me = session.status === "signed-in" ? session.staff : null;
  const canAssignRoles = me?.role === "master";

  const [team, setTeam] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", title: "", role: "employee" as StaffRole });

  const patch = (id: string, change: Partial<StaffMember>, message: string) => {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, ...change } : m)));
    setNote(message);
  };

  function add() {
    if (!form.name.trim() || !form.email.trim()) return;
    setTeam((prev) => [
      ...prev,
      {
        id: `st-new-${Date.now()}`,
        name: form.name.trim(),
        email: form.email.trim(),
        title: form.title.trim() || STAFF_ROLE_LABEL[form.role],
        role: form.role,
        active: true,
        addedAt: Date.now(),
        lastActiveAt: Date.now(),
      },
    ]);
    setNote(`${form.name.trim()} added as ${STAFF_ROLE_LABEL[form.role]}. They'll get an invite once email is connected.`);
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
            <Plus aria-hidden width={16} height={16} />
            Add team member
          </Button>
        }
      />

      {adding ? (
        <Panel tone="gold" title="Add a team member">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Field label="Full name" htmlFor="t-name" required>
              <Input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Work email" htmlFor="t-email" required>
              <Input id="t-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Title" htmlFor="t-title">
              <Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Role" htmlFor="t-role">
              <Select
                id="t-role"
                value={form.role}
                disabled={!canAssignRoles}
                onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
              <Button type="submit">Add member</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {note ? <SavedNote>{note}</SavedNote> : null}

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
                <InlineSelect<StaffRole>
                  label={`Role for ${m.name}`}
                  value={m.role}
                  options={ROLE_OPTIONS}
                  onChange={(role) => patch(m.id, { role }, `${m.name} is now ${STAFF_ROLE_LABEL[role]}.`)}
                />
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
              <div className="flex justify-end">
                <Toggle
                  label={`${m.name} has access`}
                  checked={m.active}
                  disabled={m.id === me?.id}
                  onChange={(active) =>
                    patch(m.id, { active }, `${m.name}'s access ${active ? "restored" : "suspended"}.`)
                  }
                />
              </div>
            ),
          },
        ]}
      />
      <DemoNote />
    </div>
  );
}
