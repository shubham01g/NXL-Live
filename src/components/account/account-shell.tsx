"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Plan } from "@/lib/domain/types";
import { Container } from "@/components/ui/layout";
import { useSession } from "@/lib/auth/use-session";
import { AccountNav, AccountNavCompact } from "./account-nav";
import { ProfileCard } from "./profile-card";
import { SetupBanner } from "./setup-banner";

/**
 * The member shell.
 *
 * Guarding happens here rather than in middleware because at M2 the session
 * lives in the browser — the server genuinely cannot know who this is. The
 * `loading` state matters: without it, the first paint would bounce a
 * signed-in member to /membership before the store has read localStorage.
 *
 * M3 moves the session to an httpOnly cookie and this guard becomes a
 * server-side redirect; the layout below it stays as it is.
 */
export function AccountShell({
  plans,
  children,
}: {
  plans: Plan[];
  children: ReactNode;
}) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "signed-out") router.replace("/membership");
  }, [session.status, router]);

  if (session.status !== "signed-in") {
    return (
      <Container className="pb-24 pt-28">
        <p className="sr-only" role="status">
          {session.status === "loading"
            ? "Loading your account"
            : "Redirecting to sign in"}
        </p>
        <div aria-hidden className="space-y-4">
          <div className="skeleton h-48 rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="skeleton h-80 rounded-xl" />
            <div className="skeleton h-80 rounded-xl" />
          </div>
        </div>
      </Container>
    );
  }

  const member = session.member;

  return (
    <Container className="pb-24 pt-28">
      <ProfileCard member={member} plans={plans} />

      <div className="mt-4">
        <SetupBanner member={member} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
        {/* min-w-0: a grid item defaults to min-width:auto, which would let the
            mobile nav's horizontal scroller size the column to its full content
            width instead of clamping and scrolling inside it. */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">
            <AccountNav member={member} />
          </div>
          <div className="lg:hidden">
            <AccountNavCompact member={member} />
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
