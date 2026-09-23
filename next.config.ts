import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // the standalone bundle does not carry .sql files, and the app migrates at boot
  outputFileTracingIncludes: { "/**": ["./lib/migrations/**"] },
};

export default config;
