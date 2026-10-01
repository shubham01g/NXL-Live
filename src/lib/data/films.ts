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
 * Unlike the brand films they carry sound: on a listing page they play with
 * controls; in the reel strips they loop muted. Each car's main reel is its
 * listing's `video`.
 *
 * The strips play silent copies under `media/reels/muted/` — the same video
 * stream, bit for bit, with the audio track dropped (~10% lighter). The
 * sources were already heavily compressed, so re-encoding any smaller
 * measurably cost picture quality (VMAF); the strips save load by how they
 * load instead (see ReelStrip).
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

export interface Reel {
  /** The listing the reel links to. */
  slug: string;
  title: string;
  video: MediaVideo;
  /** Silent file the strip loops. */
  loop: string;
}

/** A listing's reel in a strip, looping its silent copy. */
const listingReel = (slug: keyof typeof LISTING_REELS, title: string): Reel => ({
  slug,
  title,
  video: LISTING_REELS[slug],
  loop: `/media/reels/muted/${slug}.mp4`,
});

/** A strip-only reel — already silent, so it loops its own file. */
const stripReel = (slug: string, title: string, video: MediaVideo): Reel => ({ slug, title, video, loop: video.src });

/** Car reels for the strips on the home and fleet pages, in running order. */
export const CAR_REELS: Reel[] = [
  stripReel("mclaren-gt", "Hourly exotics on Ocean Drive", reel("media/reels/mclaren-hourly", "NXL promo: the McLaren GT on Ocean Drive, rentable by the hour")),
  listingReel("rolls-royce-cullinan-black-badge", "Rolls-Royce Cullinan Black Badge"),
  listingReel("chevrolet-corvette-c8-white", "Corvette C8 White Edition"),
  listingReel("bentley-bentayga", "Bentley Bentayga"),
  listingReel("mercedes-benz-s-class", "Mercedes-Benz S-Class"),
  listingReel("mclaren-gt", "McLaren GT"),
  listingReel("lexus-lc-500-convertible", "Lexus LC 500 Convertible"),
  listingReel("porsche-macan", "Porsche Macan"),
  stripReel("rolls-royce-cullinan-black-badge", "Inside the Black Badge", reel("media/reels/cullinan-black-badge-cockpit", "The Cullinan Black Badge cockpit and starlight interior")),
  stripReel("chevrolet-corvette-c8-white", "Corvette C8 · interior", reel("media/reels/corvette-white-interior", "The white Corvette C8's cockpit and seats")),
  listingReel("mercedes-benz-s-580", "Mercedes-Benz S 580"),
];
