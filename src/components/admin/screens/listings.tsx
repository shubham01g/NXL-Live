"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Media } from "@/components/ui/media";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Panel, SavedNote } from "@/components/account/panel";
import { money } from "@/lib/domain/format";
import type { Listing, ListingKind, ListingStatus, RateUnit } from "@/lib/domain/types";
import { useStaff } from "@/lib/auth/staff-session";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { LISTING_META } from "../status";

/**
 * Fleet and estate management — the prototype's "cars" and "homes" tabs.
 *
 * Status is operational state only (a car in the shop), which is the one
 * thing an employee flips most, so it is editable straight from the row.
 * Rates and deposit live in the editor; rate changes are Master Admin only,
 * matching who could set live pricing in the prototype.
 */

const UNITS: Record<ListingKind, RateUnit[]> = {
  car: ["hour", "day", "week", "month"],
  home: ["day", "week", "month"],
};

const STATUS_OPTIONS = (Object.keys(LISTING_META) as ListingStatus[]).map((value) => ({
  value,
  label: LISTING_META[value].label,
}));

type Filter = "all" | ListingStatus;

interface Draft {
  id: string | null;
  name: string;
  category: string;
  location: string;
  deposit: string;
  rates: Partial<Record<RateUnit, string>>;
  status: ListingStatus;
  featured: boolean;
}

function toDraft(listing: Listing | null, kind: ListingKind): Draft {
  return {
    id: listing?.id ?? null,
    name: listing?.name ?? "",
    category: listing?.category ?? (kind === "car" ? "Luxury SUV" : "Oceanfront estate"),
    location: listing?.location ?? "South Beach, Miami",
    deposit: String(listing?.deposit ?? (kind === "car" ? 750 : 1500)),
    rates: Object.fromEntries(
      UNITS[kind].map((u) => [u, listing?.rates[u] != null ? String(listing.rates[u]) : ""]),
    ),
    status: listing?.status ?? "maintenance",
    featured: listing?.featured ?? false,
  };
}

export function ListingsScreen({ kind, initial }: { kind: ListingKind; initial: Listing[] }) {
  const session = useStaff();
  const canPrice = session.status === "signed-in" && session.staff.role !== "employee";

  const [listings, setListings] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const noun = kind === "car" ? "car" : "estate";
  const plural = kind === "car" ? "Cars" : "Homes";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(
      (l) =>
        (filter === "all" || l.status === filter) &&
        (!q || `${l.name} ${l.category} ${l.location}`.toLowerCase().includes(q)),
    );
  }, [listings, query, filter]);

  const setStatus = (id: string, status: ListingStatus) =>
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));

  const setFeatured = (id: string, featured: boolean) =>
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, featured } : l)));

  function save() {
    if (!draft || !draft.name.trim()) return;
    const rates = Object.fromEntries(
      Object.entries(draft.rates)
        .filter(([, v]) => v && Number(v) > 0)
        .map(([u, v]) => [u, Math.round(Number(v))]),
    );
    const patch = {
      name: draft.name.trim(),
      category: draft.category.trim(),
      location: draft.location.trim(),
      deposit: Math.round(Number(draft.deposit) || 0),
      rates,
      status: draft.status,
      featured: draft.featured,
    };

    if (draft.id) {
      setListings((prev) => prev.map((l) => (l.id === draft.id ? ({ ...l, ...patch } as Listing) : l)));
    } else {
      // New profiles copy the shape of an existing listing of the same kind so
      // every required field is present; photos arrive with the M3 uploader.
      const template = initial[0];
      const slug = patch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const created = {
        ...template,
        ...patch,
        id: `${kind}-draft-${Date.now()}`,
        slug,
        photo: null,
        gallery: [],
        video: null,
        rating: 0,
        trips: 0,
        bookedRanges: [],
      } as Listing;
      setListings((prev) => [created, ...prev]);
    }
    setSaved(`${patch.name} saved.`);
    setDraft(null);
  }

  const available = listings.filter((l) => l.status === "available").length;
  const inService = listings.filter((l) => l.status === "maintenance").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={kind === "car" ? "Fleet" : "Estates"}
        title={plural}
        description={`Create ${noun} profiles, set live rates, and flip availability in real time.`}
        actions={
          <Button onClick={() => { setDraft(toDraft(null, kind)); setSaved(null); }}>
            <Plus aria-hidden width={16} height={16} />
            New {noun}
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: `${plural} listed`, value: listings.length },
          { label: "Available now", value: available },
          { label: "Booked", value: listings.filter((l) => l.status === "booked").length },
          { label: "In service", value: inService },
        ]}
      />

      {draft ? (
        <Panel
          tone="gold"
          title={draft.id ? `Edit ${draft.name || noun}` : `New ${noun} profile`}
          description={canPrice ? undefined : "Rates and deposit are set by Master Admin."}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name" htmlFor="l-name" required>
                <Input id="l-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              </Field>
              <Field label="Category" htmlFor="l-cat">
                <Input id="l-cat" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              </Field>
              <Field label="Location" htmlFor="l-loc">
                <Input id="l-loc" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {UNITS[kind].map((u) => (
                <Field key={u} label={`Per ${u} ($)`} htmlFor={`l-rate-${u}`}>
                  <Input
                    id={`l-rate-${u}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    disabled={!canPrice}
                    value={draft.rates[u] ?? ""}
                    onChange={(e) => setDraft({ ...draft, rates: { ...draft.rates, [u]: e.target.value } })}
                  />
                </Field>
              ))}
              <Field label="Deposit ($)" htmlFor="l-dep">
                <Input
                  id="l-dep"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  disabled={!canPrice}
                  value={draft.deposit}
                  onChange={(e) => setDraft({ ...draft, deposit: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-3 text-sm text-cream/85">
                Status
                <InlineSelect
                  label="Status"
                  value={draft.status}
                  options={STATUS_OPTIONS}
                  onChange={(status) => setDraft({ ...draft, status })}
                />
              </label>
              <span className="flex items-center gap-3 text-sm text-cream/85">
                <Toggle
                  label="Featured on the home page"
                  checked={draft.featured}
                  onChange={(featured) => setDraft({ ...draft, featured })}
                />
                Featured on the home page
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit">Save {noun}</Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {saved ? <SavedNote>{saved}</SavedNote> : null}

      <Toolbar>
        <SearchInput
          value={query}
          onChange={setQuery}
          label={`Search ${plural.toLowerCase()}`}
          placeholder={`Search ${plural.toLowerCase()} by name, category, location…`}
        />
        <SegmentedControl<Filter>
          label="Filter by status"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[{ value: "all", label: "All" }, ...STATUS_OPTIONS]}
          className="w-full sm:w-auto"
        />
      </Toolbar>

      <DataTable
        caption={plural}
        rows={rows}
        rowKey={(l) => l.id}
        empty={`No ${plural.toLowerCase()} match.`}
        columns={[
          {
            key: "name",
            header: kind === "car" ? "Car" : "Estate",
            cell: (l) => (
              <div className="flex items-center gap-3">
                <Media src={l.photo} alt={l.name} sizes="80px" className="w-20 shrink-0" rounded />
                <Primary title={l.name} sub={`${l.category} · ${l.location}`} />
              </div>
            ),
          },
          {
            key: "rates",
            header: "Rates",
            hideBelow: "md",
            cell: (l) => (
              <div className="space-y-0.5 text-xs">
                {UNITS[kind].slice(0, 2).map((u) => (
                  <p key={u}>
                    <span className="text-cream">{l.rates[u] != null ? money(l.rates[u]!) : "—"}</span>
                    <span className="text-muted"> / {u}</span>
                  </p>
                ))}
              </div>
            ),
          },
          { key: "deposit", header: "Deposit", align: "right", hideBelow: "lg", cell: (l) => money(l.deposit) },
          {
            key: "status",
            header: "Status",
            cell: (l) => (
              <InlineSelect
                label={`Status of ${l.name}`}
                value={l.status}
                options={STATUS_OPTIONS}
                onChange={(s) => setStatus(l.id, s)}
              />
            ),
          },
          {
            key: "featured",
            header: "Featured",
            hideBelow: "sm",
            cell: (l) => (
              <Toggle label={`Feature ${l.name}`} checked={l.featured} onChange={(f) => setFeatured(l.id, f)} />
            ),
          },
          {
            key: "actions",
            header: "",
            align: "right",
            cell: (l) => (
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => { setDraft(toDraft(l, kind)); setSaved(null); }}
                  aria-label={`Edit ${l.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-gold"
                >
                  <Pencil width={15} height={15} />
                </button>
                {l.id.includes("-draft-") ? null : (
                  <Link
                    href={`/${kind === "car" ? "cars" : "homes"}/${l.slug}`}
                    aria-label={`Open ${l.name} on the site`}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-gold"
                  >
                    <ArrowUpRight width={15} height={15} />
                  </Link>
                )}
              </div>
            ),
          },
        ]}
      />

      <DemoNote />
    </div>
  );
}
