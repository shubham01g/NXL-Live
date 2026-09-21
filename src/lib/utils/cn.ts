import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge does not know our custom type scale. Left to its heuristics it
 * treats any unrecognised `text-*` as a text COLOUR, so `text-display-3` and
 * `text-cream` land in the same conflict group and the size is silently
 * dropped — every display heading quietly rendered at inherited size.
 *
 * Registering the scale as font-size fixes the grouping.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display-1", "display-2", "display-3", "display-4", "2xs"] },
      ],
    },
  },
});

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
