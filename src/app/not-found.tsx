import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Eyebrow } from "@/components/ui/primitives";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center py-32">
        <Container className="text-center">
          <Eyebrow className="justify-center">Error 404</Eyebrow>
          <h1 className="mx-auto mt-6 max-w-2xl font-display text-display-2 text-balance text-cream max-sm:text-[2.75rem]">
            This one has already left the garage.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted">
            The page you are after does not exist, or the listing has moved. The rest of
            the fleet is still here.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/cars" size="lg">
              Browse the fleet
              <ArrowRight aria-hidden width={16} height={16} />
            </ButtonLink>
            <ButtonLink href="/" variant="outline" size="lg">
              Back to home
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
