"use client";

import { useState } from "react";
import { ArrowRight, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { SITE } from "@/lib/domain/site";
import type { CarListing } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Container, SectionHeading, StatGrid } from "@/components/ui/layout";
import { Badge, Card, Eyebrow } from "@/components/ui/primitives";
import { Alert } from "@/components/ui/feedback";
import { Accordion } from "@/components/ui/disclosure";
import { ListingCard } from "@/components/site/listing-card";
import { BookingPanel } from "@/components/site/booking-panel";
import { Wordmark } from "@/components/site/wordmark";

export interface ThemeOption {
  id: string;
  label: string;
  tagline: string;
  notes: string[];
  swatches: { name: string; value: string }[];
}

export const THEMES: ThemeOption[] = [
  {
    id: "atelier",
    label: "A · Midnight Atelier",
    tagline: "Warm near-black, antique gold, high-contrast serif.",
    notes: [
      "Closest to the existing navy-and-gold logo, so brand recognition carries over.",
      "Serif display against a humanist sans — the pairing does the heavy lifting.",
      "Gold is rationed: accents, hairlines and one CTA per view, never a wash.",
      "Best for: positioning NXL as a marque. Feels like a watch brand, not software.",
    ],
    swatches: [
      { name: "Ink", value: "#08060a" },
      { name: "Surface", value: "#17131a" },
      { name: "Gold", value: "#c19a5b" },
      { name: "Cream", value: "#f5f1e8" },
    ],
  },
  {
    id: "daylight",
    label: "B · Monaco Daylight",
    tagline: "Bone paper, deep navy ink, gold reserved for hairlines.",
    notes: [
      "Inverts the ground. Reads like a print magazine or a Loro Piana lookbook.",
      "Didone serif set large, with tight rules and generous margins.",
      "Far better daylight legibility on a phone — which is where most bookings happen.",
      "Best for: widening appeal beyond the nightlife read. Feels editorial and expensive.",
    ],
    swatches: [
      { name: "Bone", value: "#f4f1ea" },
      { name: "Paper", value: "#ffffff" },
      { name: "Navy", value: "#101d31" },
      { name: "Gold rule", value: "#c9b183" },
    ],
  },
  {
    id: "carbon",
    label: "C · Carbon & Chrome",
    tagline: "Graphite, chrome, geometric sans. Near-monochrome.",
    notes: [
      "A configurator, not a boutique. Squared corners, tight grid, numbers up front.",
      "One geometric sans throughout — no serif anywhere.",
      "Chrome replaces gold entirely; the only warmth is the live-status amber.",
      "Best for: the spec-driven buyer. Feels like a McLaren build page.",
    ],
    swatches: [
      { name: "Carbon", value: "#0a0b0c" },
      { name: "Graphite", value: "#23272b" },
      { name: "Chrome", value: "#c9d1d9" },
      { name: "Bright", value: "#eef1f4" },
    ],
  },
];

const FAQS = [
  {
    question: "Is a security deposit required?",
    answer:
      "Yes — placed at pickup rather than charged at booking, and released after a clean return.",
  },
  {
    question: "Can I book for just one hour?",
    answer:
      "You can. There is no 24-hour minimum on any car in the fleet.",
  },
];

export function ThemeShowcase({ cars }: { cars: CarListing[] }) {
  const [theme, setTheme] = useState(THEMES[0]);
  const featured = cars.slice(0, 3);

  return (
    <>
      {/* ------------------------- switcher (unthemed) ------------------------- */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#07080a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-4 px-4 py-3.5 sm:px-6">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/45">
            UI direction
          </p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={t.id === theme.id}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  t.id === theme.id
                    ? "bg-white text-[#07080a] font-medium"
                    : "border border-white/15 text-white/70 hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="ml-auto hidden text-sm text-white/45 lg:block">{theme.tagline}</p>
        </div>
      </div>

      {/* --------------------------- themed app slice -------------------------- */}
      <div data-theme={theme.id} className="bg-ink text-cream">
        {/* header */}
        <header className="border-b border-line">
          <Container className="flex items-center justify-between gap-6 py-4">
            <div className="flex items-center gap-8">
              <Wordmark className="h-8 w-auto" />
              <nav className="hidden items-center gap-5 lg:flex">
                {["Exotic Cars", "Luxury Homes", "Subscription", "Loyalty", "Partners"].map(
                  (label, i) => (
                    <span
                      key={label}
                      className={cn(
                        "gold-underline cursor-default pb-0.5 text-[0.8125rem] font-medium",
                        i === 0 ? "text-gold" : "text-cream/75",
                      )}
                    >
                      {label}
                    </span>
                  ),
                )}
              </nav>
            </div>
            <div className="hidden items-center gap-4 lg:flex">
              <span className="flex items-center gap-2 text-[0.8125rem] text-cream/70">
                <Phone aria-hidden width={14} height={14} />
                <span className="font-mono tabular-nums">{SITE.contact.phone}</span>
              </span>
              <Button size="sm" className="px-5 py-2.5">
                Reserve
              </Button>
            </div>
          </Container>
        </header>

        {/* hero */}
        <section className="relative isolate overflow-hidden py-20 sm:py-28">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(110%_80%_at_50%_100%,var(--color-gold-800),transparent_62%)] opacity-60"
          />
          <Container>
            <div className="max-w-3xl">
              <Eyebrow>Certified exotic cars &amp; private estates</Eyebrow>
              <h1 className="mt-6 font-display text-display-1 text-balance text-cream max-sm:text-[3rem]">
                Your dream car.
                <span className="block text-gold">By the hour.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-cream/80">
                You do not need a whole day to live the fantasy. Concierge delivery, one
                flat rate card, and estates by the day, week or month.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button size="lg">
                  Browse the fleet
                  <ArrowRight aria-hidden width={16} height={16} />
                </Button>
                <Button variant="outline" size="lg">
                  Explore estates
                </Button>
              </div>
            </div>

            <StatGrid
              className="mt-14"
              stats={[
                { label: "Cars in fleet", value: cars.length },
                { label: "Private estates", value: 4 },
                { label: "Service area", value: "South Beach" },
                { label: "Concierge", value: "24 / 7" },
              ]}
            />
          </Container>
        </section>

        {/* fleet */}
        <section className="py-16">
          <Container>
            <SectionHeading
              eyebrow="The fleet"
              title="Trending this week"
              action={
                <Button variant="ghost">
                  View all {cars.length} cars
                  <ArrowRight aria-hidden width={14} height={14} />
                </Button>
              }
            />
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((car) => (
                <ListingCard key={car.id} listing={car} />
              ))}
            </div>
          </Container>
        </section>

        {/* booking panel + system detail */}
        <section className="py-16">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
              <div>
                <Eyebrow>Booking</Eyebrow>
                <h2 className="mt-5 font-display text-display-4 text-cream">
                  The panel that does the selling
                </h2>
                <p className="mt-4 text-muted">
                  Rate tabs, live breakdown, deposit disclosure. This is the component the
                  whole funnel leans on, so it is worth judging each direction on it.
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  <Badge tone="gold">Accent</Badge>
                  <Badge tone="success">Available</Badge>
                  <Badge tone="warning">In service</Badge>
                  <Badge tone="danger">Booked</Badge>
                  <Badge>Neutral</Badge>
                </div>

                <Alert tone="warning" className="mt-6" title="Deposit is held, not charged">
                  {money(500)} is placed at pickup and released after a clean return.
                </Alert>

                <Accordion className="mt-8" items={FAQS} />

                {/* palette + type */}
                <div className="mt-10 grid grid-cols-4 gap-3">
                  {theme.swatches.map((s) => (
                    <div key={s.name}>
                      <div
                        className="h-14 w-full rounded-md border border-line"
                        style={{ background: s.value }}
                      />
                      <p className="mt-2 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted">
                        {s.name}
                      </p>
                      <p className="font-mono text-[0.625rem] text-muted-dim">{s.value}</p>
                    </div>
                  ))}
                </div>

                <Card className="mt-6 p-6">
                  <p className="font-display text-display-4 text-cream">Display 60</p>
                  <p className="mt-2 font-display text-2xl text-cream">
                    Heading — the quick brown fox
                  </p>
                  <p className="mt-2 text-base text-cream/80">
                    Body copy at sixteen pixels, set for long-form reading across a
                    comfortable measure.
                  </p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-gold">
                    Mono label · tabular 1234567890
                  </p>
                </Card>
              </div>

              <div className="lg:sticky lg:top-24 lg:self-start">
                <BookingPanel listing={featured[0]} />
              </div>
            </div>
          </Container>
        </section>

        {/* footer */}
        <footer className="border-t border-line py-10">
          <Container className="flex flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
            <Wordmark className="h-7 w-auto" />
            <p>
              © {new Date().getFullYear()} {SITE.name} · {SITE.domain}
            </p>
          </Container>
        </footer>
      </div>

      {/* --------------------------- rationale (unthemed) --------------------------- */}
      <div className="border-t border-white/10 bg-[#07080a] py-12">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/45">
            {theme.label}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{theme.tagline}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {theme.notes.map((note) => (
              <li key={note} className="flex gap-3 text-sm text-white/65">
                <span aria-hidden className="mt-0.5 text-white/30">
                  ✦
                </span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
