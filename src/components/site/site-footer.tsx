import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/domain/site";
import { Container } from "@/components/ui/layout";
import { Wordmark } from "./wordmark";
import { NewsletterForm } from "./newsletter-form";

const COLUMNS = [
  {
    title: "Rent",
    links: [
      { href: "/cars", label: "Exotic Cars" },
      { href: "/homes", label: "Luxury Homes" },
      { href: "/subscriptions", label: "Drive Credit Wallet" },
      { href: "/loyalty", label: "Level Rewards" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/who-we-are", label: "Who We Are" },
      { href: "/partners", label: "Partner Program" },
      { href: "/contact", label: "Contact" },
    ],
  },
] as const;

const LEGAL = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/insurance", label: "Insurance & Coverage" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative mt-auto bg-surface-1/50">
      {/* Metal filament along the seam, so the footer is introduced by the
          brand rather than by a grey hairline. */}
      <div aria-hidden className="rule-gold absolute inset-x-0 top-0" />
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
        <div>
          <Wordmark className="h-8 w-auto" />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">
            Certified exotic cars and private estates, delivered across South Beach.
            Book by the hour or the month — transparent pricing, no surge, no surprises.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            <li>
              <a
                href={SITE.contact.phoneHref}
                className="flex items-center gap-2.5 text-cream/75 transition-colors hover:text-gold"
              >
                <Phone aria-hidden width={14} height={14} className="text-gold" />
                {SITE.contact.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SITE.contact.email}`}
                className="flex items-center gap-2.5 text-cream/75 transition-colors hover:text-gold"
              >
                <Mail aria-hidden width={14} height={14} className="text-gold" />
                {SITE.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-cream/75">
              <MapPin aria-hidden width={14} height={14} className="mt-0.5 text-gold" />
              <span>
                {SITE.contact.address.street}
                <br />
                {SITE.contact.address.city}, {SITE.contact.address.state}{" "}
                {SITE.contact.address.zip}
              </span>
            </li>
          </ul>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-mono text-2xs uppercase text-gold">{col.title}</h2>
            <ul className="mt-6 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream/75 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="font-mono text-2xs uppercase text-gold">The Drop List</h2>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            New arrivals and members-only pricing, before anyone else.
          </p>
          <NewsletterForm />
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE.name} · {SITE.domain}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-6">
            {LEGAL.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-cream"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </Container>
      </div>
    </footer>
  );
}
