"use client";

import Link from "next/link";
import { shortDate } from "@/lib/domain/format";
import type { Review } from "@/lib/domain/types";
import { useMember } from "@/lib/auth/use-session";
import { C } from "@/lib/data/demo";
import { useCollection } from "@/lib/data/demo-store";
import { useMemberBookings } from "@/lib/data/member-bookings";
import { Card, Stars } from "@/components/ui/primitives";

/**
 * Reviews members post from their completed bookings, shown under the
 * listing's published reviews, plus the prompt to leave one. Posting happens
 * on the booking page so only guests who actually rented can review.
 */
export function MemberReviews({ listingId }: { listingId: string }) {
  const member = useMember();
  const reviews = useCollection<Review>(C.reviews, []).filter((r) => r.listingId === listingId);
  const bookings = useMemberBookings(member);
  const eligible = bookings.find((b) => b.listingId === listingId && b.status === "completed");
  const already = member && reviews.some((r) => r.authorName === member.name);

  return (
    <>
      {reviews.length ? (
        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {reviews.map((review) => (
            <Card key={review.id} as="li" className="p-6">
              <div className="flex items-center gap-3">
                <span aria-hidden className="metal-plate grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-semibold">
                  {review.authorName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-cream">{review.authorName}</p>
                  <p className="text-xs text-muted-dim">{shortDate(review.createdAt)} · Verified rental</p>
                </div>
                <Stars value={review.rating} size={12} className="ml-auto shrink-0" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-cream/75">{review.comment}</p>
            </Card>
          ))}
        </ul>
      ) : null}
      <p className="mt-6 text-xs text-muted-dim">
        {eligible && !already ? (
          <>
            You rented this one —{" "}
            <Link href={`/account/bookings/${eligible.id}`} className="text-gold hover:underline">
              leave a review
            </Link>
            .
          </>
        ) : (
          "Reviews are left by members after a completed rental."
        )}
      </p>
    </>
  );
}
