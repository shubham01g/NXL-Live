/**
 * Single source of truth for site-level constants.
 *
 * The prototype had three conflicting sets of contact details (index.html
 * JSON-LD, the Contact page, and store.tsx) and two different domains.
 * The milestone brief confirms nxlexoticrentals.com. Everything reads here.
 */

export const SITE = {
  name: "Next Level Exotic Rentals",
  shortName: "NXL",
  wordmark: "NXL Certified Exotic Rentals",
  domain: "nxlexoticrentals.com",
  url: "https://www.nxlexoticrentals.com",
  tagline: "Certified exotic cars & private estates, delivered.",
  description:
    "Rent exotic cars by the hour, day or week and private estates by the day, week or month. Concierge delivery across South Beach, Miami. Transparent pricing, no surge.",

  serviceArea: "South Beach, Miami, FL",

  contact: {
    // TODO(client): confirm real concierge line, inbox and HQ address.
    phone: "+1 (305) 555-0192",
    phoneHref: "tel:+13055550192",
    email: "drive@nxlexoticrentals.com",
    supportEmail: "support@nxlexoticrentals.com",
    hours: "Daily · 7am – midnight ET",
    address: {
      street: "1200 Ocean Drive",
      city: "Miami Beach",
      state: "FL",
      zip: "33139",
      country: "US",
    },
  },

  social: {
    instagram: "https://instagram.com/nxlexotics",
    x: "https://x.com/nxlexotics",
  },
} as const;

/** Base coordinates for the South Beach depot — delivery distance is measured from here. */
export const BASE_COORDS = { lat: 25.7817, lng: -80.13 } as const;
