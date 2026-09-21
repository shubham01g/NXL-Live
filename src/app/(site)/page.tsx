import { ArrowRight } from "lucide-react";
import { repo } from "@/lib/data";
import { money } from "@/lib/domain/format";
import { SITE } from "@/lib/domain/site";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeading, StatGrid } from "@/components/ui/layout";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { ListingCard } from "@/components/site/listing-card";
import { Hero } from "@/components/site/hero";
import { HomeSchema } from "@/components/site/site-schema";

export default async function HomePage() {
  const [cars, homes, plans, stats] = await Promise.all([
    repo.listCars(),
    repo.listHomes(),
    repo.listPlans(),
    repo.getStats(),
  ]);

  const featuredCars = cars.filter((c) => c.featured).slice(0, 3);
  const featuredHomes = homes.filter((h) => h.featured).slice(0, 2);
  const entryRate = Math.min(...cars.map((c) => c.rates.hour ?? Infinity));
  const collector = plans.find((p) => p.featured) ?? plans[1];

  return (
    <>
      <HomeSchema carCount={stats.carCount} homeCount={stats.homeCount} />
      <Hero
        eyebrow="Certified exotic cars & private estates"
        title={
          <>
            Your dream car.
            <span className="block text-gold">By the hour.</span>
          </>
        }
        lede={`You do not need a whole day to live the fantasy. Book a supercar for as little as an hour — concierge delivery, one flat rate card, and daily or weekly windows when you want more. Estates by the day, week or month.`}
        actions={
          <>
            <ButtonLink href="/cars" size="lg">
              Browse the fleet
              <ArrowRight aria-hidden width={16} height={16} />
            </ButtonLink>
            <ButtonLink href="/homes" variant="outline" size="lg">
              Explore estates
            </ButtonLink>
          </>
        }
      >
        <StatGrid
          className="mt-14"
          stats={[
            { label: "Cars in fleet", value: stats.carCount },
            { label: "Private estates", value: stats.homeCount },
            { label: "Service area", value: "South Beach" },
            { label: "Concierge", value: "24 / 7" },
          ]}
        />
      </Hero>

      {/* ------------------------------ rent your way ----------------------------- */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Rent your way"
            title="No 24-hour minimums. Start at one hour."
            description={`Most exotic rentals force a full day on you. We do not — the fleet starts at ${money(entryRate)} an hour, and the meter only runs as long as you want it to.`}
          />

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                href: "/cars",
                index: "01",
                title: "Cars",
                windows: "Hourly · Daily · Weekly · Monthly",
                body: "A sunset run in a Huracán costs less than dinner for two. Go daily or weekly when you want more road under you.",
              },
              {
                href: "/homes",
                index: "02",
                title: "Estates",
                windows: "Daily · Weekly · Monthly",
                body: "Oceanfront villas and Ocean Drive penthouses for a weekend or an entire season — with garages built around collections.",
              },
              {
                href: "/subscriptions",
                index: "03",
                title: "Credit Wallet",
                windows: "One-time purchase · Members only",
                body: "Buy credits once and spend them across the whole fleet. No recurring billing, no contracts, no expiry.",
              },
            ].map((item) => (
              <Card
                key={item.href}
                as="article"
                className="group relative p-7 transition-all duration-300 ease-editorial hover:border-gold/40 hover:bg-surface-2/60"
              >
                <span className="font-mono text-sm text-gold">{item.index}</span>
                <h3 className="mt-5 font-display text-2xl font-semibold text-cream">
                  <a href={item.href} className="after:absolute after:inset-0">
                    {item.title}
                  </a>
                </h3>
                <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-gold/80">
                  {item.windows}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{item.body}</p>
                <span
                  aria-hidden
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                >
                  Explore
                  <ArrowRight width={14} height={14} />
                </span>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------ featured cars ----------------------------- */}
      <Section size="sm">
        <Container>
          <SectionHeading
            eyebrow="The fleet"
            title="Trending this week"
            action={
              <ButtonLink href="/cars" variant="ghost" className="hidden sm:inline-flex">
                View all {stats.carCount} cars
                <ArrowRight aria-hidden width={14} height={14} />
              </ButtonLink>
            }
          />
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCars.map((car, i) => (
              <ListingCard key={car.id} listing={car} priority={i === 0} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ----------------------------- featured homes ----------------------------- */}
      <Section size="sm">
        <Container>
          <SectionHeading
            eyebrow="Private estates"
            title="Where the fleet comes home"
            action={
              <ButtonLink href="/homes" variant="ghost" className="hidden sm:inline-flex">
                View all estates
                <ArrowRight aria-hidden width={14} height={14} />
              </ButtonLink>
            }
          />
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {featuredHomes.map((home) => (
              <ListingCard key={home.id} listing={home} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ---------------------------- subscription teaser ---------------------------- */}
      <Section>
        <Container>
          <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-surface-2 via-surface-1 to-ink p-8 md:p-14">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <Eyebrow>New · Industry first</Eyebrow>
                <h2 className="mt-5 font-display text-display-3 text-balance text-cream">
                  A rotating garage on your terms.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-cream/75">
                  Buy a credit wallet once and spend it across the entire fleet —
                  supercars, estates, hourly or monthly. {collector.name} loads{" "}
                  {money(collector.credits)} of drive credit for {money(collector.price)}{" "}
                  and activates {collector.grantsTier} tier on day one.
                </p>
                <ButtonLink href="/subscriptions" size="lg" className="mt-9">
                  See the plans
                  <ArrowRight aria-hidden width={16} height={16} />
                </ButtonLink>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { t: "Drive credit wallet", d: "Roll it across cars and estates." },
                  { t: "Priority booking", d: "Skip the queue on new arrivals." },
                  { t: "Flat rate card", d: "No surge. Ever. You know the price." },
                  { t: "Concierge delivery", d: "It comes to you. Always." },
                ].map((f) => (
                  <div key={f.t} className="rounded-lg border border-line bg-ink/50 p-5">
                    <p className="font-display text-lg font-semibold text-gold">{f.t}</p>
                    <p className="mt-1.5 text-sm text-muted">{f.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* -------------------------------- partnership ------------------------------- */}
      <Section size="sm">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Eyebrow>Partnership program</Eyebrow>
              <h2 className="mt-5 font-display text-display-3 text-balance text-cream">
                Built for boutique hotels & the luxury industry.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-cream/75">
                We partner with hotels, resorts, concierges, yacht charters and private
                aviation — any business whose clients live at the top. Refer a guest and
                earn up to <span className="text-gold">12% of every rental</span>, paid
                Net-15.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Free to join — apply online or let our team onboard you",
                  "A unique referral code and trackable link for your guests",
                  "Your clients get member-level pricing on cars and estates",
                  "Automatic tracking and transparent payouts",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm text-cream/85">
                    <span aria-hidden className="mt-0.5 text-gold">
                      ✦
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/partners" className="mt-9">
                Become a partner
                <ArrowRight aria-hidden width={16} height={16} />
              </ButtonLink>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { t: "Boutique hotels", d: "Turn guest requests into revenue." },
                { t: "Concierge services", d: "Deliver the drive, earn the credit." },
                { t: "Yacht & aviation", d: "Complete the luxury itinerary." },
                { t: "Events & travel", d: "Elevate every celebration and trip." },
              ].map((c) => (
                <Card key={c.t} className="p-6">
                  <p className="font-display text-lg font-semibold text-gold">{c.t}</p>
                  <p className="mt-1.5 text-sm text-muted">{c.d}</p>
                </Card>
              ))}
              <div className="rounded-lg border border-gold/25 bg-gradient-to-br from-surface-2 to-ink p-6 sm:col-span-2">
                <p className="font-mono text-2xs uppercase text-muted">Partner earnings</p>
                <p className="mt-2.5 font-display text-3xl font-semibold text-cream">
                  Up to 12% per rental
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  No caps, no minimums, Net-15 payouts.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ----------------------------------- CTA ---------------------------------- */}
      <Section size="lg">
        <Container className="text-center">
          <Eyebrow className="justify-center">Ready when you are</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-3xl font-display text-display-2 text-balance text-cream">
            Your next chapter starts with the key.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/cars" size="lg">
              Reserve a car
              <ArrowRight aria-hidden width={16} height={16} />
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline" size="lg">
              Talk to the team
            </ButtonLink>
          </div>
          <p className="mt-8 text-sm text-muted">
            Concierge {SITE.contact.hours.toLowerCase()} ·{" "}
            <a href={SITE.contact.phoneHref} className="gold-underline text-cream/80">
              {SITE.contact.phone}
            </a>
          </p>
        </Container>
      </Section>
    </>
  );
}
