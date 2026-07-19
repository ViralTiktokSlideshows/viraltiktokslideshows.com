import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://viraltiktokslideshows.com";

// Only the handful of routes that are actually public, unique, and meant to
// be found via search — everything else is disallowed in robots.ts (auth
// pages, dashboard, checkout/success/error states). Blog posts are appended
// from the registry so a new post is discoverable the moment it's added.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const postRoutes: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.dateModified),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/generate`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...postRoutes,
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
