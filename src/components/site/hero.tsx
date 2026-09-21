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
          {/* Horizon glow — reads as a car emerging from low light. */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_100%,rgba(200,161,94,0.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_15%_20%,rgba(29,44,72,0.7),transparent_70%)]" />
          {/* Faint horizontal rule suggesting a road plane. */}
          <div className="absolute bottom-[22%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
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
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_20%_0%,rgba(200,161,94,0.1),transparent_65%)]"
      />
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
