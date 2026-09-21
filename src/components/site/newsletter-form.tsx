"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

/**
 * "The Drop List" signup.
 *
 * No provider is wired in M1/M2 by design — the real send lands at M5 with
 * SendGrid. Until then this validates and confirms locally, so the UI is
 * complete and only the submit handler changes later.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="mt-5 flex items-center gap-2 text-sm text-success">
        <Check aria-hidden width={16} height={16} />
        You are on the list — welcome to Next Level.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) setDone(true);
      }}
      className="mt-5 flex overflow-hidden rounded-full border border-line bg-ink/60 transition-colors focus-within:border-gold/60"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-cream outline-none placeholder:text-muted-dim"
      />
      <button
        type="submit"
        className="flex items-center gap-1.5 bg-gold px-5 text-sm font-semibold text-ink transition-colors hover:bg-gold-200"
      >
        Join
        <ArrowRight aria-hidden width={14} height={14} />
      </button>
    </form>
  );
}
