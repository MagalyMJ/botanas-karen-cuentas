import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo se usan en desarrollo local sin DATABASE_URL (src/db/local.ts); se cargan desde
  // node_modules en vez de empaquetarse.
  serverExternalPackages: ["@electric-sql/pglite", "drizzle-kit"],
};

export default nextConfig;
