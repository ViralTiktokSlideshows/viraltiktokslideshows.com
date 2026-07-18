"use client";

import { env } from "@viraltiktokslideshows/env/web";

import { authedFetch } from "./api-fetch";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

// Client for the admin-only TikHub research proxy (see the /api/research/tikhub
// route in apps/server/src/index.ts). Everything goes through our own server,
// which attaches the TikHub key and enforces admin access -- the browser never
// sees the key.

export type ProxyResult = {
  status: number;
  ok: boolean;
  // Parsed JSON when possible, otherwise the raw string.
  data: unknown;
};

type QueryValue = string | number | boolean | undefined | null;

// Malleable call: hit ANY TikHub endpoint, e.g.
//   tikhubProxy("api/v1/tiktok/web/fetch_search_video", { keyword: "gym", count: 20 })
export async function tikhubProxy(
  endpoint: string,
  query?: Record<string, QueryValue>,
): Promise<ProxyResult> {
  const path = endpoint.trim().replace(/^\/+/, "");
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  const url = `${SERVER_URL}/api/research/tikhub/${path}${qs ? `?${qs}` : ""}`;

  const res = await authedFetch(url);
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

// --- Normalized TikTok post, dug out of TikHub's (nested, evolving) shapes ---

export type TikTokPost = {
  id: string;
  caption: string;
  authorName: string;
  authorHandle: string;
  cover: string | null;
  // Present + non-empty => a photo-mode post (slideshow / carousel).
  imageCount: number;
  isSlideshow: boolean;
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: number | null;
  url: string;
};

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

function firstUrl(node: unknown): string | null {
  const list = (node as { url_list?: unknown })?.url_list;
  if (Array.isArray(list) && typeof list[0] === "string") return list[0];
  return null;
}

// Heuristic: does this object look like a TikTok post/aweme?
function looksLikePost(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    "aweme_id" in o ||
    "aweme_info" in o ||
    ("desc" in o && ("statistics" in o || "author" in o))
  );
}

// Walk the response and collect the first meaningful array of posts. TikHub
// wraps search results differently across endpoints (data.data, data.aweme_list,
// data.videos, ...), so rather than hard-code one path we find the richest
// array of post-shaped objects.
export function extractPosts(data: unknown): TikTokPost[] {
  const found: unknown[] = [];

  function visit(node: unknown, depth: number) {
    if (!node || depth > 6) return;
    if (Array.isArray(node)) {
      if (node.some(looksLikePost)) {
        for (const item of node) if (looksLikePost(item)) found.push(item);
      } else {
        for (const item of node) visit(item, depth + 1);
      }
      return;
    }
    if (typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) {
        visit(value, depth + 1);
      }
    }
  }

  visit(data, 0);
  return found.map(normalizePost).filter((p): p is TikTokPost => p !== null);
}

function normalizePost(raw: unknown): TikTokPost | null {
  if (!raw || typeof raw !== "object") return null;
  // Some feeds wrap the real object under aweme_info.
  const o = (("aweme_info" in raw ? (raw as Record<string, unknown>).aweme_info : raw) ??
    raw) as Record<string, unknown>;

  const id = String(o.aweme_id ?? o.id ?? o.group_id ?? "");
  if (!id) return null;

  const author = (o.author ?? {}) as Record<string, unknown>;
  const stats = (o.statistics ?? o.stats ?? {}) as Record<string, unknown>;
  const video = (o.video ?? {}) as Record<string, unknown>;
  const imagePost = (o.image_post_info ?? o.imagePostInfo ?? {}) as Record<string, unknown>;
  const images = (imagePost.images ?? []) as unknown[];

  const cover =
    firstUrl(video.cover) ??
    firstUrl(video.origin_cover) ??
    firstUrl(video.dynamic_cover) ??
    (images.length > 0
      ? firstUrl((images[0] as Record<string, unknown>)?.display_image)
      : null);

  const handle = String(author.unique_id ?? author.uniqueId ?? "");

  return {
    id,
    caption: String(o.desc ?? o.title ?? ""),
    authorName: String(author.nickname ?? author.nick_name ?? handle ?? "Unknown"),
    authorHandle: handle,
    cover,
    imageCount: images.length,
    isSlideshow: images.length > 0,
    playCount: num(stats.play_count ?? stats.playCount),
    likeCount: num(stats.digg_count ?? stats.diggCount ?? stats.like_count),
    commentCount: num(stats.comment_count ?? stats.commentCount),
    shareCount: num(stats.share_count ?? stats.shareCount),
    createTime: o.create_time ? num(o.create_time) : null,
    url: handle
      ? `https://www.tiktok.com/@${handle}/video/${id}`
      : `https://www.tiktok.com/@/video/${id}`,
  };
}

// Default TikTok keyword search. sortType: 0 relevance, 1 most liked; publishTime:
// 0 all time, 1 day, 7 week, 30 month, 90 three months, 180 six months.
export async function searchTikTok(options: {
  keyword: string;
  count?: number;
  offset?: number;
  sortType?: number;
  publishTime?: number;
}): Promise<{ result: ProxyResult; posts: TikTokPost[] }> {
  const result = await tikhubProxy("api/v1/tiktok/web/fetch_search_video", {
    keyword: options.keyword,
    count: options.count ?? 20,
    offset: options.offset ?? 0,
    sort_type: options.sortType ?? 0,
    publish_time: options.publishTime ?? 0,
  });
  return { result, posts: result.ok ? extractPosts(result.data) : [] };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
