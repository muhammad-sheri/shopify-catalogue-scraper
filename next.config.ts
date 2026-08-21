import type { NextConfig } from "next";

/**
 * In production the `api/*.py` files are deployed as Vercel Python Functions
 * and served at /api/* by the platform, so no rewrite is involved.
 *
 * `next dev` has no Python runtime, so development proxies the same paths to
 * dev_server.py instead. Guarded on NODE_ENV: shipping this rewrite to
 * production would point the deployed site at a loopback address.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const port = process.env.DEV_API_PORT ?? "5328";
    return [{ source: "/api/:path*", destination: `http://127.0.0.1:${port}/api/:path*` }];
  },
};

export default nextConfig;
