import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md / CLAUDE.md on every dev run, which leaves the
  // working tree dirty after each start. Project guidance lives in README.md.
  agentRules: false,
  // The dev-tools "N" badge sits bottom-left, on top of the access floater,
  // and every other corner is taken (logo, account, concierge). Errors still
  // raise the overlay; only the idle badge is hidden.
  devIndicators: false,
};

export default nextConfig;
