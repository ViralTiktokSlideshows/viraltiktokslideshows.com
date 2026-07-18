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

// Pulls the first string URL out of the various shapes TikTok uses: a bare
// string, { url_list: [...] }, { urlList: [...] }, or { imageURL: { urlList } }.
function firstUrl(node: unknown): string | null {
  if (typeof node === "string") return node || null;
  if (!node || typeof node !== "object") return null;
  const o = node as Record<string, unknown>;
  const list = (o.url_list ?? o.urlList) as unknown;
  if (Array.isArray(list) && typeof list[0] === "string") return list[0];
  if (o.imageURL) return firstUrl(o.imageURL);
  return null;
}

// A search result card from fetch_general_search is { type, item, common } for
// posts (type 1) or { type: 4, user_list } for the "Users" card. We only want
// the post cards.
function cardItem(el: unknown): Record<string, unknown> | null {
  if (!el || typeof el !== "object") return null;
  const o = el as Record<string, unknown>;
  if (o.item && typeof o.item === "object") return o.item as Record<string, unknown>;
  if (o.aweme_info && typeof o.aweme_info === "object") {
    return o.aweme_info as Record<string, unknown>;
  }
  if ("desc" in o && ("stats" in o || "statistics" in o || "author" in o)) return o;
  return null;
}

// Finds the search result array (data.data for general search) and normalizes
// each post card. Falls back to a recursive search for any array of post cards
// so it still works if the wrapper shape shifts.
export function extractPosts(payload: unknown): TikTokPost[] {
  const direct = (payload as { data?: { data?: unknown } })?.data?.data;
  let cards: unknown[] | null = Array.isArray(direct) ? direct : null;

  if (!cards) {
    const stack: unknown[] = [payload];
    let depth = 0;
    while (stack.length && depth < 5000 && !cards) {
      const node = stack.shift();
      depth += 1;
      if (Array.isArray(node)) {
        if (node.some((el) => cardItem(el))) cards = node;
        else stack.push(...node);
      } else if (node && typeof node === "object") {
        stack.push(...Object.values(node as Record<string, unknown>));
      }
    }
  }

  if (!cards) return [];
  return cards
    .map((el) => {
      const item = cardItem(el);
      return item ? normalizePost(item) : null;
    })
    .filter((p): p is TikTokPost => p !== null);
}

function normalizePost(o: Record<string, unknown>): TikTokPost | null {
  const id = String(o.aweme_id ?? o.id ?? o.group_id ?? "");
  if (!id) return null;

  const author = (o.author ?? {}) as Record<string, unknown>;
  const stats = (o.stats ?? o.statistics ?? o.statsV2 ?? {}) as Record<string, unknown>;
  const video = (o.video ?? {}) as Record<string, unknown>;
  const imagePost = (o.imagePost ?? o.image_post_info ?? {}) as Record<string, unknown>;
  const images = (imagePost.images ?? []) as unknown[];

  const cover =
    (images.length > 0 ? firstUrl(images[0]) : null) ??
    firstUrl(imagePost.cover) ??
    firstUrl(video.cover) ??
    firstUrl(video.originCover ?? video.origin_cover) ??
    firstUrl(video.dynamicCover ?? video.dynamic_cover);

  const handle = String(author.uniqueId ?? author.unique_id ?? "");

  return {
    id,
    caption: String(o.desc ?? o.title ?? ""),
    authorName: String(author.nickname ?? author.nick_name ?? handle ?? "Unknown"),
    authorHandle: handle,
    cover,
    imageCount: images.length,
    isSlideshow: images.length > 0,
    playCount: num(stats.playCount ?? stats.play_count),
    likeCount: num(stats.diggCount ?? stats.digg_count ?? stats.like_count),
    commentCount: num(stats.commentCount ?? stats.comment_count),
    shareCount: num(stats.shareCount ?? stats.share_count),
    createTime: o.createTime ? num(o.createTime) : o.create_time ? num(o.create_time) : null,
    url: handle
      ? `https://www.tiktok.com/@${handle}/video/${id}`
      : `https://www.tiktok.com/@/video/${id}`,
  };
}

// How many general-search pages one search may fetch while hunting for
// slideshows. TikHub's web search has no photo-mode filter, so a page is a
// mix of videos + slideshows; we page through and keep only the slideshows.
// Each page is a separate billed TikHub request, so this is capped low to
// keep the cost of one search predictable.
const MAX_SEARCH_PAGES = 3;

// Slideshow-only TikTok keyword search. Pages through fetch_general_search
// (the current supported endpoint -- fetch_search_video was removed and 400s),
// keeping only photo-mode posts (carousels/slideshows) and dropping videos +
// user cards, until it has `limit` of them or runs out of pages. `offset` +
// `search_id` from each response drive the next page.
export async function searchTikTok(options: {
  keyword: string;
  limit?: number;
}): Promise<{ result: ProxyResult; posts: TikTokPost[] }> {
  const limit = options.limit ?? 20;
  const collected: TikTokPost[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let searchId = "";
  let lastResult: ProxyResult = { status: 0, ok: false, data: null };

  for (let page = 0; page < MAX_SEARCH_PAGES && collected.length < limit; page++) {
    const result = await tikhubProxy("api/v1/tiktok/web/fetch_general_search", {
      keyword: options.keyword,
      offset,
      search_id: searchId,
    });
    lastResult = result;
    if (!result.ok) break;

    for (const post of extractPosts(result.data)) {
      if (post.isSlideshow && !seen.has(post.id)) {
        seen.add(post.id);
        collected.push(post);
      }
    }

    const feed = (result.data as { data?: { has_more?: unknown; cursor?: unknown } })?.data;
    searchId = extractSearchId(result.data) || searchId;
    if (!feed?.has_more) break;
    offset = typeof feed.cursor === "number" ? feed.cursor : offset + 10;
  }

  return { result: lastResult, posts: collected.slice(0, limit) };
}

// The general-search response carries a search_id (aka log_pb.impr_id / extra)
// needed to fetch the next page. Best-effort dig for it.
function extractSearchId(data: unknown): string {
  let found = "";
  function visit(node: unknown, depth: number) {
    if (found || !node || depth > 6 || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(o)) {
      if ((key === "search_id" || key === "impr_id") && typeof value === "string" && value) {
        found = value;
        return;
      }
      if (typeof value === "object") visit(value, depth + 1);
    }
  }
  visit(data, 0);
  return found;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
