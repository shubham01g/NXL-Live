import type { ReactNode } from "react";
import { Container, Section } from "@/components/ui/layout";
import { Alert } from "@/components/ui/feedback";
import { PageHero } from "./hero";

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

/**
 * Shared shell for Terms, Privacy and Insurance.
 *
 * In the prototype all three of these links pointed at /contact. They are real
 * pages now, but the copy below is a working baseline — it must be reviewed by
 * the client's counsel before launch, which the banner states plainly.
 */
export function LegalPage({
  eyebrow,
  title,
  lede,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      {/* The title is kept a plain string for metadata; the metal treatment is
          applied here so all three legal pages carry it identically. */}
      <PageHero
        eyebrow={eyebrow}
        title={<span className="text-metal block">{title}</span>}
        lede={lede}
      />

      <Section size="sm">
        <Container>
          <div className="max-w-3xl">
            <p className="font-mono text-2xs uppercase text-muted">
              Last updated · {updated}
            </p>

            <Alert tone="warning" className="mt-6" title="Draft pending legal review">
              This is a working draft prepared for the site build. It must be reviewed and
              approved by qualified counsel before the platform goes live.
            </Alert>

            <div className="mt-12 space-y-10">
              {sections.map((section, i) => (
                <section key={section.heading}>
                  <h2 className="flex gap-4 font-display text-xl font-semibold text-cream">
                    <span className="text-metal-soft font-mono text-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3 pl-10 text-sm leading-relaxed text-muted">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
