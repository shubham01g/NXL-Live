"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarX, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Media } from "@/components/ui/media";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { StatGrid } from "@/components/ui/layout";
import { Modal } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { money, shortDate } from "@/lib/domain/format";
import type { CarListing, DateRange, HomeListing, Listing, ListingKind, ListingStatus, RateUnit } from "@/lib/domain/types";
import { C, logAudit } from "@/lib/data/demo";
import { create, patch, remove, useCollection } from "@/lib/data/demo-store";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { LISTING_META } from "../status";
import { useActor } from "../reservation-tools";

/**
 * Fleet and estate management — the prototype's "cars" and "homes" tabs and
 * its profile Editor.
 *
 * Status is operational state only (a car in the shop), the thing an employee
 * flips most, so it is editable straight from the row. The editor carries
 * everything else: specs, all four rates, deposit, photos and blocked dates.
 * Rates are Admin and above; deleting a listing is Master only.
 */

const UNITS: Record<ListingKind, RateUnit[]> = {
  car: ["hour", "day", "week", "month"],
  home: ["day", "week", "month"],
};

const STATUS_OPTIONS = (Object.keys(LISTING_META) as ListingStatus[]).map((value) => ({ value, label: LISTING_META[value].label }));

type Filter = "all" | ListingStatus;

export function ListingsScreen({ kind, initial }: { kind: ListingKind; initial: Listing[] }) {
  const actor = useActor();
  const canPrice = actor.role !== "employee";
  const all = useCollection<Listing>(C.listings, initial);
  const listings = all.filter((l) => l.kind === kind);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Listing | "new" | null>(null);

  const noun = kind === "car" ? "car" : "estate";
  const plural = kind === "car" ? "Cars" : "Homes";
  const categories = Array.from(new Set(listings.map((l) => l.category)));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => (filter === "all" || l.status === filter) && (!q || `${l.name} ${l.category} ${l.location}`.toLowerCase().includes(q)));
  }, [listings, query, filter]);

  const update = (l: Listing, change: Partial<Listing>, detail: string) => {
    patch<Listing>(C.listings, l, change);
    logAudit(actor.name, "listing.updated", l.name, detail);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={kind === "car" ? "Fleet" : "Estates"}
        title={plural}
        description={`Create ${noun} profiles, set rates, upload photos, block dates and flip availability in real time.`}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden width={16} height={16} /> New {noun}
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: `${plural} listed`, value: listings.length },
          { label: "Available now", value: listings.filter((l) => l.status === "available").length },
          { label: "Booked", value: listings.filter((l) => l.status === "booked").length },
          { label: "In service", value: listings.filter((l) => l.status === "maintenance").length },
        ]}
      />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} label={`Search ${plural.toLowerCase()}`} placeholder={`Search ${plural.toLowerCase()} by name, category, location…`} />
        <SegmentedControl<Filter> label="Filter by status" size="sm" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, ...STATUS_OPTIONS]} className="w-full sm:w-auto" />
      </Toolbar>

      <DataTable
        caption={plural}
        rows={rows}
        rowKey={(l) => l.id}
        empty={`No ${plural.toLowerCase()} match.`}
        onRowClick={(l) => setEditing(l)}
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
          { key: "blocked", header: "Blocked", align: "right", hideBelow: "xl", cell: (l) => (l.bookedRanges.length ? `${l.bookedRanges.length} range${l.bookedRanges.length > 1 ? "s" : ""}` : "—") },
          { key: "deposit", header: "Deposit", align: "right", hideBelow: "lg", cell: (l) => money(l.deposit) },
          {
            key: "status",
            header: "Status",
            cell: (l) => (
              <InlineSelect
                label={`Status of ${l.name}`}
                value={l.status}
                options={STATUS_OPTIONS}
                onChange={(s) => {
                  update(l, { status: s }, `Status → ${LISTING_META[s].label}`);
                  toast(`${l.name}: ${LISTING_META[s].label.toLowerCase()}.`);
                }}
              />
            ),
          },
          {
            key: "featured",
            header: "Featured",
            hideBelow: "sm",
            cell: (l) => <Toggle label={`Feature ${l.name}`} checked={l.featured} onChange={(f) => update(l, { featured: f }, f ? "Featured" : "Unfeatured")} />,
          },
          {
            key: "actions",
            header: "",
            align: "right",
            cell: (l) => (
              <div className="flex justify-end gap-1">
                <button type="button" onClick={() => setEditing(l)} aria-label={`Edit ${l.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-gold">
                  <Pencil width={15} height={15} />
                </button>
                {l.id.includes("-new-") ? null : (
                  <Link href={`/${kind === "car" ? "cars" : "homes"}/${l.slug}`} aria-label={`Open ${l.name} on the site`} className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-gold">
                    <ArrowUpRight width={15} height={15} />
                  </Link>
                )}
              </div>
            ),
          },
        ]}
      />

      <DemoNote />

      {editing ? (
        <ListingEditor
          key={editing === "new" ? "new" : editing.id}
          kind={kind}
          listing={editing === "new" ? null : editing}
          template={listings[0] ?? initial[0]}
          categories={categories}
          canPrice={canPrice}
          canDelete={actor.isMaster}
          actor={actor.name}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

type EditorTab = "details" | "specs" | "pricing" | "photos" | "availability";

function ListingEditor({
  kind,
  listing,
  template,
  categories,
  canPrice,
  canDelete,
  actor,
  onClose,
}: {
  kind: ListingKind;
  listing: Listing | null;
  template: Listing;
  categories: string[];
  canPrice: boolean;
  canDelete: boolean;
  actor: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<EditorTab>("details");
  const [draft, setDraft] = useState<Listing>(() =>
    listing
      ? structuredClone(listing)
      : ({
          ...structuredClone(template),
          id: `${kind}-new-${Date.now().toString(36)}`,
          slug: "",
          name: "",
          description: "",
          photo: null,
          gallery: [],
          rating: 0,
          trips: 0,
          featured: false,
          status: "maintenance",
          bookedRanges: [],
        } as Listing),
  );
  const [newCategory, setNewCategory] = useState("");
  const [blockFrom, setBlockFrom] = useState("");
  const [blockTo, setBlockTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noun = kind === "car" ? "car" : "estate";

  const set = <K extends keyof Listing>(k: K, v: Listing[K]) => setDraft((d) => ({ ...d, [k]: v }) as Listing);
  const car = draft.kind === "car" ? (draft as CarListing) : null;
  const home = draft.kind === "home" ? (draft as HomeListing) : null;
  const setSpec = (k: string, v: string | number) => setDraft((d) => ({ ...d, specs: { ...d.specs, [k]: v } }) as Listing);

  function save() {
    if (draft.name.trim().length < 2) {
      setTab("details");
      return setError(`Give the ${noun} a name.`);
    }
    const slug = draft.slug || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const next = { ...draft, name: draft.name.trim(), slug, photo: draft.photo ?? draft.gallery[0] ?? null } as Listing;
    if (listing) {
      patch<Listing>(C.listings, listing, next);
      const rateChanged = JSON.stringify(listing.rates) !== JSON.stringify(next.rates);
      logAudit(actor, rateChanged ? "listing.rate_changed" : "listing.updated", next.name, rateChanged ? `Rates ${Object.entries(next.rates).map(([u, r]) => `${u} $${r}`).join(", ")}` : "Profile edited");
    } else {
      create<Listing>(C.listings, next);
      logAudit(actor, "listing.created", next.name, `${next.category} · ${next.location}`);
    }
    toast(`${next.name} saved.`);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      eyebrow={listing ? `${noun} profile` : `New ${noun}`}
      title={draft.name || (listing ? listing.name : `New ${noun} profile`)}
      footer={
        <>
          {listing && canDelete ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:text-danger"
              onClick={() => {
                remove(C.listings, listing.id);
                logAudit(actor, "listing.deleted", listing.name, "Removed from the catalogue");
                toast(`${listing.name} deleted.`, "warning");
                onClose();
              }}
            >
              <Trash2 aria-hidden width={14} height={14} /> Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save {noun}</Button>
        </>
      }
    >
      <Tabs<EditorTab>
        label="Editor sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: "details", label: "Details" },
          { value: "specs", label: "Specs" },
          { value: "pricing", label: "Pricing" },
          { value: "photos", label: "Photos", count: draft.gallery.length },
          { value: "availability", label: "Blocked dates", count: draft.bookedRanges.length },
        ]}
      />
      <div className="mt-6">
        {tab === "details" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="le-name" required><Input id="le-name" value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Location" htmlFor="le-loc"><Input id="le-loc" value={draft.location} onChange={(e) => set("location", e.target.value)} /></Field>
            <Field label="Category" htmlFor="le-cat">
              <Select
                id="le-cat"
                value={categories.includes(draft.category) ? draft.category : "__new"}
                onChange={(e) => (e.target.value === "__new" ? set("category", newCategory) : set("category", e.target.value))}
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new">+ New category…</option>
              </Select>
            </Field>
            {!categories.includes(draft.category) ? (
              <Field label="New category" htmlFor="le-newcat">
                <Input id="le-newcat" value={newCategory} onChange={(e) => { setNewCategory(e.target.value); set("category", e.target.value); }} placeholder={kind === "car" ? "e.g. Supercar" : "e.g. Island villa"} />
              </Field>
            ) : <div />}
            <Field label="Description" htmlFor="le-desc" className="sm:col-span-2"><Textarea id="le-desc" rows={4} value={draft.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-ink/40 p-3 text-sm text-cream">
              Status
              <InlineSelect label="Status" value={draft.status} options={STATUS_OPTIONS} onChange={(s) => set("status", s)} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-ink/40 p-3 text-sm text-cream">
              Featured on the home page
              <Toggle label="Featured" checked={draft.featured} onChange={(v) => set("featured", v)} />
            </label>
          </div>
        ) : tab === "specs" ? (
          car ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Make" htmlFor="ls-make"><Input id="ls-make" value={car.make} onChange={(e) => set("make" as keyof Listing, e.target.value as never)} /></Field>
              <Field label="Year" htmlFor="ls-year"><Input id="ls-year" type="number" value={car.year} onChange={(e) => set("year" as keyof Listing, Number(e.target.value) as never)} /></Field>
              <Field label="Seats" htmlFor="ls-seats"><Input id="ls-seats" type="number" value={car.specs.seats} onChange={(e) => setSpec("seats", Number(e.target.value))} /></Field>
              <Field label="Horsepower" htmlFor="ls-hp"><Input id="ls-hp" type="number" value={car.specs.horsepower} onChange={(e) => setSpec("horsepower", Number(e.target.value))} /></Field>
              <Field label="0–60 (s)" htmlFor="ls-060"><Input id="ls-060" type="number" step="0.1" value={car.specs.zeroToSixty} onChange={(e) => setSpec("zeroToSixty", Number(e.target.value))} /></Field>
              <Field label="Top speed (mph)" htmlFor="ls-top"><Input id="ls-top" type="number" value={car.specs.topSpeed} onChange={(e) => setSpec("topSpeed", Number(e.target.value))} /></Field>
              <Field label="Transmission" htmlFor="ls-tx"><Input id="ls-tx" value={car.specs.transmission} onChange={(e) => setSpec("transmission", e.target.value)} /></Field>
              <Field label="Drivetrain" htmlFor="ls-dt"><Input id="ls-dt" value={car.specs.drivetrain} onChange={(e) => setSpec("drivetrain", e.target.value)} /></Field>
            </div>
          ) : home ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Bedrooms" htmlFor="ls-beds"><Input id="ls-beds" type="number" value={home.specs.beds} onChange={(e) => setSpec("beds", Number(e.target.value))} /></Field>
              <Field label="Bathrooms" htmlFor="ls-baths"><Input id="ls-baths" type="number" value={home.specs.baths} onChange={(e) => setSpec("baths", Number(e.target.value))} /></Field>
              <Field label="Sleeps" htmlFor="ls-sleeps"><Input id="ls-sleeps" type="number" value={home.specs.sleeps} onChange={(e) => setSpec("sleeps", Number(e.target.value))} /></Field>
              <Field label="Amenities" htmlFor="ls-amen" hint="Comma-separated" className="sm:col-span-3">
                <Textarea id="ls-amen" rows={3} value={home.amenities.join(", ")} onChange={(e) => set("amenities" as keyof Listing, e.target.value.split(",").map((a) => a.trim()).filter(Boolean) as never)} />
              </Field>
            </div>
          ) : null
        ) : tab === "pricing" ? (
          <div className="space-y-4">
            {!canPrice ? <Alert tone="info">Rates and deposits are set by Admin and Master Admin.</Alert> : null}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {UNITS[kind].map((u) => (
                <Field key={u} label={`Per ${u} ($)`} htmlFor={`lp-${u}`}>
                  <Input
                    id={`lp-${u}`}
                    type="number"
                    min={0}
                    disabled={!canPrice}
                    value={draft.rates[u] ?? ""}
                    onChange={(e) => set("rates", { ...draft.rates, [u]: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </Field>
              ))}
              <Field label="Deposit ($)" htmlFor="lp-dep"><Input id="lp-dep" type="number" min={0} disabled={!canPrice} value={draft.deposit} onChange={(e) => set("deposit", Number(e.target.value))} /></Field>
              {home ? (
                <Field label="Cleaning fee ($)" htmlFor="lp-clean"><Input id="lp-clean" type="number" min={0} disabled={!canPrice} value={home.cleaningFee} onChange={(e) => set("cleaningFee" as keyof Listing, Number(e.target.value) as never)} /></Field>
              ) : null}
            </div>
            <p className="text-xs text-muted-dim">Flat rate-card pricing — the rate shown is the rate charged. Rate changes are recorded in the audit log.</p>
          </div>
        ) : tab === "photos" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {draft.gallery.map((src, i) => (
                <div key={`${src.slice(0, 40)}-${i}`} className="group relative">
                  <Media src={src} alt={`Photo ${i + 1}`} aspect="4/3" sizes="200px" />
                  {draft.photo === src ? <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-widest text-gold">Cover</span> : null}
                  <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button type="button" onClick={() => set("photo", src)} className="rounded-full bg-ink/85 px-2.5 py-1 text-[0.6875rem] text-cream hover:text-gold">Make cover</button>
                    <button type="button" aria-label="Remove photo" onClick={() => setDraft((d) => ({ ...d, gallery: d.gallery.filter((_, n) => n !== i), photo: d.photo === src ? null : d.photo }) as Listing)} className="grid h-6 w-6 place-items-center rounded-full bg-ink/85 text-cream hover:text-danger">
                      <X width={12} height={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <FileDrop label="Add a photo" hint="JPG or PNG. Stored in this browser until uploads go live." value={null} accept="image/*" scan="photo" onChange={(v) => v && setDraft((d) => ({ ...d, gallery: [...d.gallery, v], photo: d.photo ?? v }) as Listing)} />
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted">Blocked dates can&apos;t be booked at checkout — for servicing, owner use or a private hold.</p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="From" htmlFor="lb-from"><Input id="lb-from" type="date" value={blockFrom} onChange={(e) => setBlockFrom(e.target.value)} /></Field>
              <Field label="To" htmlFor="lb-to"><Input id="lb-to" type="date" value={blockTo} onChange={(e) => setBlockTo(e.target.value)} /></Field>
              <Button
                variant="outline"
                onClick={() => {
                  const start = new Date(`${blockFrom}T00:00:00`).getTime();
                  const end = new Date(`${blockTo}T23:59:59`).getTime();
                  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return setError("Choose a valid range.");
                  setError(null);
                  set("bookedRanges", [...draft.bookedRanges, { start, end }].sort((a, b) => a.start - b.start));
                  setBlockFrom("");
                  setBlockTo("");
                }}
              >
                <CalendarX aria-hidden width={15} height={15} /> Block dates
              </Button>
            </div>
            {draft.bookedRanges.length ? (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {draft.bookedRanges.map((r: DateRange, i) => (
                  <li key={`${r.start}-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-cream">{shortDate(r.start)} → {shortDate(r.end)}</span>
                    <button type="button" onClick={() => set("bookedRanges", draft.bookedRanges.filter((_, n) => n !== i))} className="text-xs text-muted hover:text-danger">Remove</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-dim">No blocked dates.</p>
            )}
          </div>
        )}
        {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
      </div>
    </Modal>
  );
}
