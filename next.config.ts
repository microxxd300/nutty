import type { NextConfig } from "next";

// Static export: `next build` writes plain HTML/JS to ./out.
// There is no server — all data access goes straight to Supabase from the browser.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
};

export default nextConfig;
