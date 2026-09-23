# NXL — Next Level Exotic Rentals

Production rebuild of the Exotic Car & Luxury Estate rental platform for
`nxlexoticrentals.com`, replacing a Figma Make prototype that stored every
record in a single `localStorage` blob.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · lucide-react
Deployed on Vercel. Supabase (Postgres / Auth / Storage / Realtime) arrives at M3.

---

## Milestones

| | Scope | Status |
|---|---|---|
| **M1** | Customer Experience UI — design system + 10 public pages | **Complete** |
| M2 | Member, Partner & Admin portal UI, booking + checkout flow | Next |
| M3 | Backend foundation — Supabase schema, auth, 5 roles, availability engine | |
| M4 | Booking engine, credit wallet, loyalty accrual, partner commissions | |
| M5 | Payments, SendGrid + Twilio, SEO, PWA, launch | |

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npx eslint src   # lint
npx tsc --noEmit # typecheck
```

---

## Architecture

```
src/
  app/(site)/        public marketing pages (M1)
  components/ui/     design-system primitives
  components/site/   marketing composites + JERALD concierge
  lib/domain/        types, pricing, loyalty, formatting, site constants
  lib/data/          repository interface + in-memory fixtures
```

### The data layer is the important part

M1 and M2 are contracted to ship before the database exists. To avoid building
throwaway UI, every page reads through an async **repository interface**
(`lib/data/repository.ts`) that is currently backed by in-memory fixtures.

At M3 we implement that same interface against Supabase and swap the export in
`lib/data/index.ts`. **No page or component changes.**

### Gold is treated as a metal, not a colour

Flat gold reads as mustard. Anything meant to look like gold is painted with a
multi-stop ramp carrying a specular highlight, defined once in `globals.css`
(`--metal-gold`, `--metal-gold-soft`, `--metal-gold-h`, `--metal-edge`) and
applied through these utilities:

| Utility | Use |
|---|---|
| `text-metal` | Headline fragments and the wordmark's X. Clipped to the glyphs. |
| `text-metal-soft` | Numerals and prices — brighter ramp so it stays readable. |
| `edge-gold` / `edge-gold-ink` | Gradient hairline borders, over surface-1 and over ink. |
| `metal-fill` | Buttons: brushed fill plus a sheen that sweeps on hover. |
| `metal-plate` | Gold surfaces that are **not** buttons — avatars, active pills, chips, toggle tracks, badges. Same ramp, no sheen. |
| `metal-track` | Thin horizontal metal: progress fills, step indicators, the eyebrow hairline. Uses the left-to-right ramp, because the 142° one shows no travel across a 6px bar. |
| `rule-gold` | A gold rule that fades out at both ends (the footer seam, the hero horizon). |

Two rules keep it from tipping into kitsch:

1. **No surface is painted in unmodulated gold.** There is no bare `bg-gold`
   block left in the app — every one is `metal-plate`, `metal-fill` or
   `metal-track`. `text-gold` on the other hand is correct and intentional for
   small type: eyebrows, mono caps, icons, inline emphasis, required-field
   asterisks. Gradient type below ~16px reads muddy.
2. **Metal marks accents, not bodies.** Headline *fragments* (never a whole
   multi-sentence headline), and figures that are the point of their block —
   prices, stat values, earn rates, step numerals. Dense number **tables** stay
   flat cream: a grid of gradient figures is unscannable.

When a metal fragment can wrap, give the span `block`. `background-clip: text`
on a wrapping inline element restarts the gradient per line box; on a block it
runs continuously across the whole headline.

Adding a new custom `text-*` utility means registering it in
`lib/utils/cn.ts` — see the note there.

### Single source of truth

`lib/domain/pricing.ts` and `lib/domain/loyalty.ts` own every number the
customer sees — rates, deposits, insurance, delivery, tiers, points. Pages,
structured data and the JERALD concierge all read from them, so they cannot
disagree with each other.

---

## Notable corrections to the prototype

The prototype's README over-claimed in several places. Verified against its source:

- **Availability was never checked against dates.** Creating a booking flipped the
  listing to `booked` regardless of window. Types here model availability as date
  ranges; `status` means operational state only. Engine lands at M3.
- **Surge pricing was advertised but disabled** (`livePrice` returned the rate
  unchanged). We present flat rate-card pricing, which is also the stronger position.
- **JERALD contradicted the product on nearly every fact** — fleet, tiers, deposits,
  and insurance at $150–250/day against a real $49. Its answers are now generated
  from `lib/domain`.
- **Browse had no search input** despite the README advertising one. Added.
- **Four car rate tabs were rendered in a three-column grid.** Fixed.
- **Hash routing** meant one URL for the whole site — no crawlable links, no
  per-page metadata. Real routes, per-page metadata, sitemap and JSON-LD now.
- Points redemption, promo codes and campaigns had no data model at all. They are
  M4 scope.

---

## Open items for the client

1. **Photography** — every listing ships `photo: null` and renders a branded
   placeholder at the correct aspect ratio. The listing gallery shows the shot list
   we need per vehicle and estate. Dropping images into the fixtures requires no
   code change.
2. **Logo** — the supplied `logo.png` is a navy raster wordmark, invisible on the
   dark background. `components/site/wordmark.tsx` is a typographic stand-in; swap
   it for an inverted SVG when available.
3. **Contact details** — the prototype carried three conflicting sets. Current
   values live in `lib/domain/site.ts` and need confirming.
4. **Fleet inventory** — fixtures carry 8 cars and 4 estates. Confirm the real list.
5. **Legal copy** — Terms, Privacy and Insurance pages are working drafts and are
   marked as pending legal review on the page itself.
