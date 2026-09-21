import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * FAQ accordion built on native details/summary — keyboard accessible and
 * fully functional with zero JavaScript. The prototype rendered its FAQs as
 * flat two-column cards, which made six questions read as a wall of text.
 */

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

export function Accordion({
  items,
  className,
}: {
  items: FaqItem[];
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-6 py-5",
              "text-left font-display text-lg text-cream transition-colors",
              "hover:text-gold [&::-webkit-details-marker]:hidden",
            )}
          >
            {item.question}
            <Plus
              aria-hidden
              width={18}
              height={18}
              className="shrink-0 text-gold transition-transform duration-300 ease-editorial group-open:rotate-45"
            />
          </summary>
          <div className="pb-6 pr-10 text-sm leading-relaxed text-muted">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
