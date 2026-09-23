import type { Metadata } from "next";
import { Suspense } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/domain/site";
import { Container, Section } from "@/components/ui/layout";
import { Card } from "@/components/ui/primitives";
import { PageHero } from "@/components/site/hero";
import { ContactForm } from "@/components/site/contact-form";
import { ConciergeTrigger } from "@/components/site/concierge/concierge-trigger";

export const metadata: Metadata = {
  title: "Contact",
  description: `Reach the NXL concierge team in ${SITE.serviceArea}. Call ${SITE.contact.phone}, email ${SITE.contact.email}, or chat with JERALD for an instant answer.`,
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    icon: Phone,
    label: "Concierge line",
    value: SITE.contact.phone,
    href: SITE.contact.phoneHref,
    hint: SITE.contact.hours,
  },
  {
    icon: Mail,
    label: "Email",
    value: SITE.contact.email,
    href: `mailto:${SITE.contact.email}`,
    hint: "Replies within the hour",
  },
  {
    icon: MapPin,
    label: "Headquarters",
    value: `${SITE.contact.address.street}, ${SITE.contact.address.city}, ${SITE.contact.address.state}`,
    href: null,
    hint: "By appointment",
  },
  {
    icon: Clock,
    label: "Service area",
    value: SITE.serviceArea,
    href: null,
    hint: "Delivery across Miami Beach & Brickell",
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title={
          <>
            Let&apos;s line up
            <span className="text-metal block">your drive.</span>
          </>
        }
        lede="Call, email or chat — whichever is fastest for you. The concierge team handles bookings, estate stays, partnerships and anything in between."
      />

      <Section size="sm">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <div>
              <ul className="space-y-4">
                {CHANNELS.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <li key={channel.label}>
                      <Card className="flex items-start gap-4 p-5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-gold">
                          <Icon aria-hidden width={17} height={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-2xs uppercase text-muted">
                            {channel.label}
                          </p>
                          {channel.href ? (
                            <a
                              href={channel.href}
                              className="mt-1.5 block text-base text-cream transition-colors hover:text-gold"
                            >
                              {channel.value}
                            </a>
                          ) : (
                            <p className="mt-1.5 text-base text-cream">{channel.value}</p>
                          )}
                          <p className="mt-1 text-xs text-muted-dim">{channel.hint}</p>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>

              <ConciergeTrigger className="mt-4" />
            </div>

            <Suspense
              fallback={
                <div className="h-[32rem] rounded-xl border border-line skeleton" />
              }
            >
              <ContactForm />
            </Suspense>
          </div>
        </Container>
      </Section>
    </>
  );
}
