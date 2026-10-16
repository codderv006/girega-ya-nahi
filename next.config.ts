import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hide the floating "N" dev-tools badge; it only exists in `next dev` anyway.
  devIndicators: false,
  // No ESLint config in this repo; types are checked with `npm run typecheck`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
