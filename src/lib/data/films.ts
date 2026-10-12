import type { MediaVideo } from "@/lib/domain/types";

/**
 * Brand films, carried over from the client's current site and re-encoded
 * under `public/media/`. They are silent loops of the storefront and the
 * fleet rather than per-car footage; a listing's own clip goes on its
 * `video` field.
 */
export const FILMS = {
  storefront: {
    src: "/media/nxl-storefront-02.mp4",
    poster: "/media/nxl-storefront-02.webp",
    label: "The fleet rolling past the NXL storefront in South Beach",
  },
  aerial: {
    src: "/media/nxl-fleet-02.mp4",
    poster: "/media/nxl-fleet-02.webp",
    label: "Aerial view of Ocean Drive and South Beach at dusk",
  },
  story: {
    src: "/media/nxl-story-01.mp4",
    poster: "/media/nxl-story-01.webp",
    label: "A couple cruising Miami Beach in a McLaren GT at golden hour",
  },
  arrival: {
    src: "/media/nxl-how-01.mp4",
    poster: "/media/nxl-how-01.webp",
    label: "A Maybach and a McLaren GT pulling up at the NXL storefront",
  },
  lineup: {
    src: "/media/nxl-why-01.mp4",
    poster: "/media/nxl-why-01.webp",
    label: "The NXL fleet lined up on a South Beach street",
  },
  street: {
    src: "/media/nxl-storefront-03-916.mp4",
    poster: "/media/nxl-storefront-03-916.webp",
    label: "The NXL storefront on a South Beach corner",
  },
} satisfies Record<string, MediaVideo>;

/* ---------------------------------- reels ---------------------------------- */

const reel = (path: string, label: string): MediaVideo => ({ src: `/${path}.mp4`, poster: `/${path}.webp`, label });

/**
 * The client's own vertical reels, shot on the lot and around South Beach.
 * They live only on the listing they show — each car's gallery leads with
 * its reels and plays them with controls (and sound, where the clip has it).
 * The main reel is the listing's `video`; any extra clips of the same car
 * follow it in the gallery.
 */
export const LISTING_REELS = {
  "rolls-royce-cullinan-black-badge": reel("fleet/rolls-royce-cullinan-black-badge/reel", "Walk-around of the Cullinan Black Badge, coach doors open on the red interior"),
  "bentley-bentayga": reel("fleet/bentley-bentayga/reel", "Close-up walk-around of the Bentley Bentayga's grille, lights and cabin"),
  "mclaren-gt": reel("fleet/mclaren-gt/reel", "The McLaren GT with its dihedral doors up"),
  "porsche-macan": reel("fleet/porsche-macan/reel", "Walk-around of the blue Porsche Macan"),
  "chevrolet-corvette-c8-white": reel("fleet/chevrolet-corvette-c8-white/reel", "The white Corvette C8 convertible, doors open, roof down"),
  "mercedes-benz-s-580": reel("fleet/mercedes-benz-s-580/reel", "The black S 580 on the showroom floor"),
  "mercedes-benz-s-class": reel("fleet/mercedes-benz-s-class/reel", "The black S-Class on Ocean Drive, rear door open on the tan interior"),
  "lexus-lc-500-convertible": reel("fleet/lexus-lc-500-convertible/reel", "Walk-around of the Lexus LC 500 Convertible, roof down"),
  "the-vantage-ocean-drive-penthouse": reel("estates/the-vantage-ocean-drive-penthouse/reel", "Walk-through of the penthouse living space and ocean view"),
} as const satisfies Record<string, MediaVideo>;

/** Further clips of a car, shown after its main reel on the listing page. */
export const EXTRA_REELS: Record<string, MediaVideo[]> = {
  "mclaren-gt": [reel("media/reels/mclaren-hourly", "NXL promo: the McLaren GT on Ocean Drive, rentable by the hour")],
  "rolls-royce-cullinan-black-badge": [reel("media/reels/cullinan-black-badge-cockpit", "The Cullinan Black Badge cockpit and starlight interior")],
  "chevrolet-corvette-c8-white": [reel("media/reels/corvette-white-interior", "The white Corvette C8's cockpit and seats")],
};
