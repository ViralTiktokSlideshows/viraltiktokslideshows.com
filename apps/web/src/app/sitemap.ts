import type { MetadataRoute } from "next";

const BASE_URL = "https://viraltiktokslideshows.com";

// Only the handful of routes that are actually public, unique, and meant to
// be found via search — everything else is disallowed in robots.ts (auth
// pages, dashboard, checkout/success/error states).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/generate`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
