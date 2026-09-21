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
