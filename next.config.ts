import type { NextConfig } from "next";
import { createRequire } from "node:module";

const pkg = createRequire(import.meta.url)("./package.json") as { version: string };

const nextConfig: NextConfig = {
  // Vercel does its own output-file tracing; standalone output breaks its
  // onBuildComplete step. Keep standalone for the Docker image build.
  output: process.env.VERCEL ? undefined : "standalone",

  // Single source of truth for the system version is package.json.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
