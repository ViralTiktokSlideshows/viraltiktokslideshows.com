import "@viraltiktokslideshows/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Google account profile photos (session.image from the OAuth claims,
    // rendered via next/image in the header + dashboard sidebar's
    // ProfileMenu) -- a fixed, well-known Google hostname, unlike the
    // per-user R2 slideshow image URLs elsewhere in the app, which use a
    // plain <img> instead specifically to avoid needing an entry here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
