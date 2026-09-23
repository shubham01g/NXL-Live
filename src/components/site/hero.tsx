import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Container } from "@/components/ui/layout";
import { Eyebrow } from "@/components/ui/primitives";

/**
 * Full-bleed homepage hero.
 *
 * Designed to stand on its own without photography — the client's fleet
 * images are still to come, so the backdrop is a built composition (layered
 * gradients, a gold horizon glow and film grain) rather than an empty frame.
 * Pass `image` once real art direction lands and it drops straight in behind
 * the same scrim.
 */
export function Hero({
  eyebrow,
  title,
  lede,
  actions,
  children,
  image,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  actions?: ReactNode;
  children?: ReactNode;
  image?: string | null;
}) {
  return (
    <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden pb-16 pt-32">
      <HeroBackdrop image={image} />

      <Container className="relative">
        <div className="max-w-3xl animate-rise">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-6 font-display text-display-1 text-balance text-cream max-sm:text-[3.25rem]">
            {title}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-cream/80">{lede}</p>
          {actions ? <div className="mt-10 flex flex-wrap gap-4">{actions}</div> : null}
        </div>
        {children}
      </Container>
    </section>
  );
}

function HeroBackdrop({ image }: { image?: string | null }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      {image ? (
        <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
      ) : (
        <>
          {/* Key light: a warm pool off the upper right, like a showroom
              spot raking across the back wall. */}
          <div className="absolute inset-0 bg-[radial-gradient(65%_75%_at_78%_8%,rgba(233,191,69,0.28),transparent_64%)]" />
          {/* Fill: deep bronze behind the headline so the black never reads dead. */}
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_12%_30%,rgba(138,107,26,0.35),transparent_68%)]" />
          {/* Bounce off the floor, under the copy. */}
          <div className="absolute inset-0 bg-[radial-gradient(110%_55%_at_45%_108%,rgba(195,154,43,0.22),transparent_62%)]" />
          {/* Horizon filament across the back wall. */}
          <div className="rule-gold absolute inset-x-0 bottom-[16%] opacity-50" />
        </>
      )}

      {/* Legibility scrim, kept light enough not to flatten the light above. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/15" />
      {/* Soft vignette to settle the corners without crushing them. */}
      <div className="absolute inset-0 bg-[radial-gradient(125%_100%_at_50%_45%,transparent_58%,rgba(7,6,5,0.7)_100%)]" />
      <div className="grain absolute inset-0 opacity-40" />
    </div>
  );
}

/* -------------------------------- page hero ------------------------------- */

/** Compact header for inner pages. */
export function PageHero({
  eyebrow,
  title,
  lede,
  actions,
  aside,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden pb-4 pt-28 sm:pt-32", className)}>
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(85%_70%_at_18%_-10%,rgba(233,191,69,0.16),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_92%_0%,rgba(138,107,26,0.24),transparent_68%)]" />
      </div>
      <Container>
        <div
          className={cn(
            "gap-10",
            aside ? "grid lg:grid-cols-[1.4fr_1fr] lg:items-end" : undefined,
          )}
        >
          <div className="max-w-3xl">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-6 font-display text-display-2 text-balance text-cream max-sm:text-[2.75rem]">
              {title}
            </h1>
            {lede ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{lede}</p>
            ) : null}
            {actions ? (
              <div className="mt-9 flex flex-wrap gap-4">{actions}</div>
            ) : null}
          </div>
          {aside ? <div>{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}
