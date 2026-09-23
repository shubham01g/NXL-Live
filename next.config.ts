import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md / CLAUDE.md on every dev run, which leaves the
  // working tree dirty after each start. Project guidance lives in README.md.
  agentRules: false,
};

export default nextConfig;
