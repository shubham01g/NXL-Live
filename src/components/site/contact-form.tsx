"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";

const TOPICS = [
  "Book a rental",
  "Drive Credit Wallet",
  "List my car or home",
  "Partnership",
  "Press",
  "Something else",
] as const;

/**
 * Concierge contact form.
 *
 * A general enquiry form. Listings that are in service hand off here as a
 * waitlist request, with the vehicle and window in the query string, so the
 * message arrives pre-written; everything bookable goes to /checkout.
 */
export function ContactForm() {
  const params = useSearchParams();
  const listing = params.get("listing");
  const unit = params.get("unit");
  const qty = params.get("qty");

  const prefillMessage = listing
    ? `I would like to reserve the ${listing.replace(/-/g, " ")}${
        unit && qty ? ` for ${qty} ${unit}${Number(qty) === 1 ? "" : "s"}` : ""
      }. Please confirm availability and next steps.`
    : "";

  const [message, setMessage] = useState(prefillMessage);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 aria-hidden width={32} height={32} className="mx-auto text-success" />
        <h2 className="mt-5 font-display text-2xl font-semibold text-cream">
          Message received
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The concierge team replies within the hour during opening times. If it is
          urgent, the phone is always faster.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setMessage("");
          }}
          className="mt-6 text-sm text-gold transition-opacity hover:opacity-80"
        >
          Send another message
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h2 className="font-display text-2xl font-semibold text-cream">Send a message</h2>
      <p className="mt-2 text-sm text-muted">
        Tell us what you are after and we will line it up.
      </p>

      <form
        className="mt-7 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="contact-name" required>
            <Input id="contact-name" name="name" required placeholder="Jane Smith" />
          </Field>
          <Field label="Email" htmlFor="contact-email" required>
            <Input
              id="contact-email"
              name="email"
              type="email"
              required
              placeholder="jane@email.com"
            />
          </Field>
        </div>

        <Field label="Topic" htmlFor="contact-topic">
          <Select
            id="contact-topic"
            name="topic"
            defaultValue={listing ? "Book a rental" : TOPICS[0]}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Message" htmlFor="contact-message" required>
          <Textarea
            id="contact-message"
            name="message"
            required
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Which car or estate, which dates, and anything else we should know."
          />
        </Field>

        <Button type="submit" size="lg" className="w-full">
          Send message
          <ArrowRight aria-hidden width={16} height={16} />
        </Button>
      </form>
    </Card>
  );
}
