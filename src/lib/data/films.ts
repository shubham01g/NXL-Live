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
    src: "/media/nxl-miami-aerial.mp4",
    poster: "/media/nxl-miami-aerial.webp",
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

/**
 * The client's own video, introducing NXL in person (asked for 2026-10-28).
 * It plays on Who We Are, with sound and controls. The page skips the section
 * while this is null, so no empty frame ships before the file arrives; encode
 * it to `public/media/nxl-founder.{mp4,webp}` and fill this in.
 */
export const FOUNDER_FILM: MediaVideo | null = null;

/**
 * Generated for the About and Who We Are pages only (2026-10-28), so nothing
 * there repeats media from a listing. Clips are cropped to remove the
 * generator's corner mark and re-encoded silent.
 */
export const ABOUT_FILMS = {
  exotic: { src: "/media/about/exotic.mp4", poster: "/media/about/exotic.webp", label: "A black supercar gliding along a palm-lined Miami Beach boulevard at golden hour" },
  luxury: { src: "/media/about/luxury.mp4", poster: "/media/about/luxury.webp", label: "Moving through an oceanfront penthouse at dusk toward the terrace and the Atlantic" },
  rewards: { src: "/media/about/rewards.mp4", poster: "/media/about/rewards.webp", label: "A starlit rear cabin with quilted cream seats and a champagne flute on the console" },
  partners: { src: "/media/about/partners.mp4", poster: "/media/about/partners.webp", label: "A black SUV arriving at a Miami Beach hotel entrance, a valet opening its door" },
  concierge: { src: "/media/about/concierge.mp4", poster: "/media/about/concierge.webp", label: "A gloved hand placing a car key into a guest's palm at sunset" },
} satisfies Record<string, MediaVideo>;

export const ABOUT_STILLS = {
  wallet: { src: "/media/about/wallet.webp", alt: "A black metal card beside a car key on gold-stitched black leather" },
  handover: { src: "/media/who-we-are/handover.webp", alt: "A chauffeur holding open the rear door of a white SUV on a South Beach street" },
};

/** Wide still over the About page's partnership banner. */
export const PARTNERSHIP_BANNER: { src: string; alt: string } | null = {
  src: "/media/about/partnership-banner.webp",
  alt: "A superyacht and a black SUV on a Miami marina dock at sunset",
};

/** What fills a page hero: a muted loop or a still. */
export type PageBackdrop = { video: MediaVideo } | { image: string; alt: string };

/**
 * Each inner page opens on its own film or still, full width under the
 * header, like the home page (client, 2026-10-29). Every entry is made for
 * that page alone. Clips are cropped to remove the generator mark; the Who
 * We Are clip starts 3.2s in, past a carmaker badge on the hood. A null
 * entry falls back to the plain hero.
 */
export const PAGE_BACKDROPS: Record<
  | "cars"
  | "homes"
  | "subscriptions"
  | "loyalty"
  | "partners"
  | "contact"
  | "whoWeAre"
  | "membership"
  | "insurance"
  | "privacy"
  | "terms",
  PageBackdrop | null
> = {
  cars: { video: { src: "/media/pages/cars.mp4", poster: "/media/pages/cars.webp", label: "Three exotic supercars driving a causeway into Miami at sunset" } },
  homes: { video: { src: "/media/pages/homes.mp4", poster: "/media/pages/homes.webp", label: "Aerial orbit of a white oceanfront villa and its glowing pool at golden hour" } },
  subscriptions: { video: { src: "/media/pages/subscriptions.mp4", poster: "/media/pages/subscriptions.webp", label: "A row of luxury cars under spotlights in a private collector garage" } },
  loyalty: { video: { src: "/media/pages/loyalty.mp4", poster: "/media/pages/loyalty.webp", label: "Champagne flutes clinking on a rooftop over the Miami skyline at dusk" } },
  partners: { video: { src: "/media/pages/partners.mp4", poster: "/media/pages/partners.webp", label: "Gliding over a luxury hotel pool deck toward the ocean at blue hour" } },
  contact: { video: { src: "/media/pages/contact.mp4", poster: "/media/pages/contact.webp", label: "A marble concierge desk with a phone, a service bell and orchids at night" } },
  whoWeAre: { video: { src: "/media/pages/who-we-are.mp4", poster: "/media/pages/who-we-are.webp", label: "A gloved hand polishing the glossy black paint of a car under strip lights" } },
  membership: { image: "/media/pages/membership.webp", alt: "A hand holding a car key as an exotic car glows in the Miami night" },
  insurance: { image: "/media/pages/insurance.webp", alt: "A black luxury SUV parked in a secure private garage at night" },
  privacy: { image: "/media/pages/privacy.webp", alt: "A tinted car window reflecting Miami neon at night" },
  terms: { image: "/media/pages/terms.webp", alt: "Blank paper, a fountain pen and a car key on a walnut desk" },
};

/* ---------------------------------- reels ---------------------------------- */

const reel = (path: string, label: string) => ({ src: `/${path}.mp4`, poster: `/${path}.webp`, label }) satisfies MediaVideo;

/**
 * Each listing's own footage. Every car leads with a landscape film, cut
 * from generated clips started on that car's own photos; the client's
 * vertical reels, shot on the lot and around South Beach, follow it as
 * extra clips. Footage lives only on the listing it shows and plays with
 * controls (and sound, where the clip has it). The main film is the
 * listing's `video`; the extras follow it in the gallery.
 */
export const LISTING_REELS = {
  "the-vantage-ocean-drive-penthouse": reel("estates/the-vantage-ocean-drive-penthouse/reel", "Walk-through of the penthouse living space and ocean view"),

  "rolls-royce-cullinan-black-badge": reel("fleet/rolls-royce-cullinan-black-badge/film", "The gunmetal Cullinan Black Badge under the palms, its red cockpit, then a sunset drive by the bay"),
  "bentley-bentayga": reel("fleet/bentley-bentayga/film", "The Bentley Bentayga at a Miami marina, its quilted rear cabin, then a drive under the palms"),
  "mclaren-gt": reel("fleet/mclaren-gt/film", "The black McLaren GT under the palms at golden hour, then its dihedral doors rising"),
  "porsche-macan": reel("fleet/porsche-macan/film", "The blue Porsche Macan in Miami Beach, its cockpit, then a drive through the palms"),
  "chevrolet-corvette-c8-white": reel("fleet/chevrolet-corvette-c8-white/film", "The white Corvette C8 convertible on Ocean Drive, then a push into its open cockpit"),
  "mercedes-benz-s-580": reel("fleet/mercedes-benz-s-580/film", "The black S 580 outside a Miami Beach hotel at dusk, its details, then a night drive through Brickell"),
  "mercedes-benz-s-class": reel("fleet/mercedes-benz-s-class/film", "The black S-Class on a palm-lined street, its cream quilted cabin, then a drive by the beach"),
  "lexus-lc-500-convertible": reel("fleet/lexus-lc-500-convertible/film", "The blue Lexus LC 500 Convertible under the palms, then top-down drives by the ocean"),
  "bmw-i8-roadster": reel("fleet/bmw-i8-roadster/film", "The BMW i8 Roadster on Ocean Drive at dusk: doors up, the cockpit, then a night drive"),
  "cadillac-escalade-iq": reel("fleet/cadillac-escalade-iq/film", "The red Escalade IQ in Brickell, its tan cabin, then a sunset drive on the causeway"),
  "cadillac-escalade-sport-platinum": reel("fleet/cadillac-escalade-sport-platinum/film", "The white Escalade Sport Platinum outside a South Beach hotel, its cabin, then a sunset drive"),
  "chevrolet-corvette-c8-stingray": reel("fleet/chevrolet-corvette-c8-stingray/film", "The silver Corvette C8 Stingray on Ocean Drive, its tan cockpit, then a drive along the ocean"),
  "dodge-challenger-srt-hellcat": reel("fleet/dodge-challenger-srt-hellcat/film", "The white Challenger Hellcat on Ocean Drive at night, its cockpit, then a launch on the causeway"),
  "jeep-wrangler-unlimited": reel("fleet/jeep-wrangler-unlimited/film", "The black Wrangler on the beach by a lifeguard tower, its open cabin, then a drive down Collins Avenue"),
  "lamborghini-urus": reel("fleet/lamborghini-urus/film", "The grey Lamborghini Urus in Miami Beach, its sport seats, then a run across the causeway"),
  "maserati-levante": reel("fleet/maserati-levante/film", "The white Maserati Levante under the palms, its trident grille, then a drive through Miami"),
  "mercedes-amg-gt-43": reel("fleet/mercedes-amg-gt-43/film", "The silver AMG GT 4-Door on the waterfront, its cockpit, then a drive along the bay"),
  "mercedes-maybach-gls": reel("fleet/mercedes-maybach-gls/film", "The black Maybach GLS at a Miami Beach hotel, its rear lounge, then Ocean Drive at night"),
  "range-rover-autobiography": reel("fleet/range-rover-autobiography/film", "The white Range Rover Autobiography at a waterfront home, its saddle-tan cabin, then a sunset drive"),
  "rolls-royce-cullinan-white": reel("fleet/rolls-royce-cullinan-white/film", "The white Rolls-Royce Cullinan on Ocean Drive, then cruising Collins Avenue"),
  "rolls-royce-wraith": reel("fleet/rolls-royce-wraith/film", "The black Rolls-Royce Wraith on Ocean Drive, its starlight headliner, then a drive past the neon"),
} as const satisfies Record<string, MediaVideo>;

/**
 * The client's "200 hourly" ad for the McLaren GT. It plays only in the home
 * page's hourly banner: no clip appears in two places on the site.
 */
export const MCLAREN_PROMO = reel("media/reels/mclaren-hourly", "NXL promo: the McLaren GT on Ocean Drive, rentable by the hour");

/** Further clips of a car, shown after its main film on the listing page. */
export const EXTRA_REELS: Record<string, MediaVideo[]> = {
  "rolls-royce-cullinan-black-badge": [reel("fleet/rolls-royce-cullinan-black-badge/reel", "Walk-around of the Cullinan Black Badge: coach doors open on the red interior, the cockpit and the starlight headliner")],
  "bentley-bentayga": [reel("fleet/bentley-bentayga/reel", "Close-up walk-around of the Bentley Bentayga's grille, lights and cabin")],
  "mclaren-gt": [reel("fleet/mclaren-gt/reel", "The McLaren GT with its dihedral doors up")],
  "porsche-macan": [reel("fleet/porsche-macan/reel", "Walk-around of the blue Porsche Macan")],
  "chevrolet-corvette-c8-white": [
    reel("fleet/chevrolet-corvette-c8-white/reel", "The white Corvette C8 convertible, doors open, roof down"),
    reel("media/reels/corvette-white-interior", "The white Corvette C8's cockpit and seats"),
  ],
  "mercedes-benz-s-580": [reel("fleet/mercedes-benz-s-580/reel", "The black S 580 on the showroom floor")],
  "mercedes-benz-s-class": [reel("fleet/mercedes-benz-s-class/reel", "The black S-Class on Ocean Drive, rear door open on the tan interior")],
  "lexus-lc-500-convertible": [reel("fleet/lexus-lc-500-convertible/reel", "Walk-around of the Lexus LC 500 Convertible, roof down")],
};
