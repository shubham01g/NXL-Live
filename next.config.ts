import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md / CLAUDE.md on every dev run, which leaves the
  // working tree dirty after each start. Project guidance lives in README.md.
  agentRules: false,
  // The dev-tools "N" badge sits bottom-left, on top of the access floater,
  // and every other corner is taken (logo, account, concierge). Errors still
  // raise the overlay; only the idle badge is hidden.
  devIndicators: false,
  // The client's current site (nxlcertifiedexoticrentals.com) will point here
  // at launch. Its fleet and booking URLs are indexed, so each one lands on the
  // matching page rather than a 404.
  async redirects() {
    return [
      ...Object.entries(OLD_VEHICLE_SLUGS).map(([from, to]) => ({
        source: `/vehicle/${from}`,
        destination: `/cars/${to}`,
        permanent: true,
      })),
      { source: "/vehicle/:slug", destination: "/cars", permanent: true },
      { source: "/fleet", destination: "/cars", permanent: true },
      { source: "/booking", destination: "/cars", permanent: true },
    ];
  },
};

/** Old `/vehicle/<slug>` → new `/cars/<slug>`. */
const OLD_VEHICLE_SLUGS: Record<string, string> = {
  "2018-rolls-royce-wraith": "rolls-royce-wraith",
  "2019-bmw-i8-roadster": "bmw-i8-roadster",
  "2021-dodge-challenger-srt-hellcat": "dodge-challenger-srt-hellcat",
  "2022-lexus-lc-500-convertible": "lexus-lc-500-convertible",
  "2022-mercedes-amg-gt-43-4-door-coupe": "mercedes-amg-gt-43",
  "2023-cadillac-escalade-sport-platinum": "cadillac-escalade-sport-platinum",
  "2023-chevrolet-corvette-c8-stingray": "chevrolet-corvette-c8-stingray",
  "2023-lamborghini-urus": "lamborghini-urus",
  "2023-mclaren-gt": "mclaren-gt",
  "2023-mercedes-benz-s-580-4matic": "mercedes-benz-s-580",
  "2024-range-rover": "range-rover-autobiography",
  "2024-rolls-royce-cullinan-white": "rolls-royce-cullinan-white",
  "chevrolet-corvette-c8-white-edition": "chevrolet-corvette-c8-white",
  "jeep-wrangler": "jeep-wrangler-unlimited",
  "maserati-levante": "maserati-levante",
  "mercedes-benz-s-class": "mercedes-benz-s-class",
  "mercedes-maybach-gls": "mercedes-maybach-gls",
  "porsche-macan": "porsche-macan",
  "rolls-royce-cullinan": "rolls-royce-cullinan-black-badge",
};

export default nextConfig;
