import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth-gated, transactional, or personalized routes — nothing here
        // is unique/indexable content, and letting crawlers hit them just
        // wastes crawl budget on pages that either redirect, require a
        // session, or are per-user (dashboard, checkout, success).
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/signup",
          "/auth/error",
          "/generate/checkout",
          "/generate/success",
          "/generate/error",
          "/generate/upgrade",
          "/onboarding",
        ],
      },
    ],
    sitemap: "https://viraltiktokslideshows.com/sitemap.xml",
  };
}
