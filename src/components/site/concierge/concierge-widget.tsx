"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { answer, GREETING, QUICK_PROMPTS, type Reply } from "./knowledge";

/** Fire this from anywhere to open the concierge. */
export const OPEN_CONCIERGE_EVENT = "nxl:open-concierge";

export function openConcierge() {
  window.dispatchEvent(new CustomEvent(OPEN_CONCIERGE_EVENT));
}

interface Message {
  id: number;
  from: "guest" | "jerald";
  text: string;
  suggestions?: string[];
}

let nextId = 0;
const message = (from: Message["from"], reply: Reply | string): Message =>
  typeof reply === "string"
    ? { id: nextId++, from, text: reply }
    : { id: nextId++, from, text: reply.text, suggestions: reply.suggestions };

export function ConciergeWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([message("jerald", GREETING)]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CONCIERGE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONCIERGE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;

    setMessages((prev) => [...prev, message("guest", text)]);
    setDraft("");
    setTyping(true);

    // A short delay so replies feel considered rather than canned.
    timerRef.current = setTimeout(
      () => {
        setTyping(false);
        setMessages((prev) => [...prev, message("jerald", answer(text))]);
      },
      700 + Math.random() * 500,
    );
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="concierge-panel"
        aria-label={open ? "Close concierge chat" : "Chat with JERALD, the NXL concierge"}
        className={cn(
          "fixed bottom-5 right-5 z-[var(--z-float)] grid h-14 w-14 place-items-center rounded-full",
          "bg-gold text-ink shadow-glow-gold transition-all duration-300 ease-editorial",
          "hover:scale-105 hover:bg-gold-200",
        )}
      >
        {open ? <X width={22} height={22} /> : <MessageCircle width={22} height={22} />}
      </button>

      {open ? (
        <div
          id="concierge-panel"
          role="dialog"
          aria-label="JERALD — NXL concierge"
          className={cn(
            "fixed bottom-24 right-5 z-[var(--z-float)] flex flex-col",
            "h-[min(560px,calc(100dvh-8rem))] w-[min(92vw,400px)]",
            "animate-rise overflow-hidden rounded-xl border border-line bg-surface-1 shadow-elev-3",
          )}
        >
          <header className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold font-display text-lg font-bold text-ink">
              J
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-cream">
                JERALD · AI Concierge
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden className="h-1.5 w-1.5 animate-live rounded-full bg-success" />
                Online
              </p>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2.5">
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.from === "guest"
                      ? "ml-auto bg-gold text-ink"
                      : "bg-surface-3 text-cream/90",
                  )}
                >
                  <RichText text={msg.text} />
                </div>

                {msg.suggestions?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-gold/30 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {typing ? (
              <div className="flex w-fit gap-1.5 rounded-lg bg-surface-3 px-4 py-3.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
                <span className="sr-only">JERALD is typing</span>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="border-t border-line bg-surface-2 px-3 py-3"
          >
            {messages.length === 1 ? (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-cream/75 transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <label htmlFor="concierge-input" className="sr-only">
                Ask JERALD a question
              </label>
              <input
                id="concierge-input"
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about the fleet, pricing, insurance…"
                className="min-w-0 flex-1 rounded-full border border-line bg-ink/60 px-4 py-2.5 text-sm text-cream outline-none transition-colors focus:border-gold/60 placeholder:text-muted-dim"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-ink transition-colors hover:bg-gold-200 disabled:opacity-40"
              >
                <Send width={16} height={16} />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

/**
 * Minimal rich text: **bold** and line breaks.
 * The prototype emitted this markup and never parsed it, so guests saw
 * literal `**Ferrari 488**` on screen.
 */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, lineIdx, lines) => (
        <Fragment key={lineIdx}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIdx) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={partIdx} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <Fragment key={partIdx}>{part}</Fragment>
            ),
          )}
          {lineIdx < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </>
  );
}
