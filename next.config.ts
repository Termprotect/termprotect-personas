import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // pdfkit se importa en runtime (Node) en /api/time-entries/export.
  // No queremos que Turbopack/webpack lo bundlee porque rompe las fuentes .afm.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
