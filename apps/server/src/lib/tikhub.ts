import { env } from "@viraltiktokslideshows/env/server";

// Thin, malleable client for TikHub's REST API (https://api.tikhub.io).
//
// Deliberately unopinionated: you pass a raw endpoint path + query and get the
// parsed JSON back. TikHub has hundreds of endpoints across TikTok/Douyin/IG/
// etc. and they evolve, so rather than hand-wrapping each one, this just
// authenticates and forwards. Build specific research helpers on top of
// tikhubGet as needed (see the examples at the bottom).
//
// This is content-research tooling (e.g. "I analysed 100 TikTok slideshows"),
// not part of the end-user product, and every call costs TikHub credits -- so
// the HTTP surface that exposes it is admin-gated (see the /api/research/tikhub
// routes + requireAdmin in apps/server/src/index.ts).

const TIKHUB_BASE_URL = "https://api.tikhub.io";
const DEFAULT_TIMEOUT_MS = 30_000;

export function isTikHubConfigured(): boolean {
  return Boolean(env.TIKHUB_API_KEY);
}

export type TikHubRequestOptions = {
  method?: string;
  // Query params -- arrays are repeated (?a=1&a=2); null/undefined are dropped.
  query?: Record<string, string | number | boolean | null | undefined | Array<string | number>>;
  // JSON body for POST/PUT/PATCH. Ignored for GET/HEAD.
  body?: unknown;
  // Extra headers merged over the defaults (Authorization is always set).
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type TikHubResponse<T = unknown> = {
  ok: boolean;
  status: number;
  // Parsed JSON when the response is JSON; otherwise the raw text under `.raw`.
  data: T | null;
  raw: string;
};

function buildQueryString(query: TikHubRequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Core passthrough. `endpoint` is any TikHub path, with or without a leading
// slash, e.g. "api/v1/tiktok/web/fetch_search_video". Throws if the key is
// unset or the request errors at the network level; a non-2xx TikHub response
// is returned normally (ok: false) so callers can inspect status + body.
export async function tikhubRequest<T = unknown>(
  endpoint: string,
  options: TikHubRequestOptions = {},
): Promise<TikHubResponse<T>> {
  const apiKey = env.TIKHUB_API_KEY;
  if (!apiKey) {
    throw new Error("TIKHUB_API_KEY is not set");
  }

  const method = (options.method ?? "GET").toUpperCase();
  const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = `${TIKHUB_BASE_URL}/${path}${buildQueryString(options.query)}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    ...options.headers,
  };

  let body: string | undefined;
  if (options.body !== undefined && method !== "GET" && method !== "HEAD") {
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // If the caller passed their own signal, abort when either fires.
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const raw = await res.text();
    let data: T | null = null;
    try {
      data = raw ? (JSON.parse(raw) as T) : null;
    } catch {
      data = null; // Non-JSON response; caller can read `.raw`.
    }
    return { ok: res.ok, status: res.status, data, raw };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

// Convenience GET, returning parsed data directly (throws on a non-2xx).
export async function tikhubGet<T = unknown>(
  endpoint: string,
  query?: TikHubRequestOptions["query"],
): Promise<T> {
  const res = await tikhubRequest<T>(endpoint, { query });
  if (!res.ok) {
    throw new Error(`TikHub ${endpoint} failed (${res.status}): ${res.raw.slice(0, 300)}`);
  }
  return res.data as T;
}

// ---------------------------------------------------------------------------
// Example research helpers. These name the specific TikHub endpoints you'll
// use most for "analyse real viral slideshows" content. Endpoint paths follow
// TikHub's docs (https://docs.tikhub.io) -- adjust freely; the base client
// above forwards whatever you give it.
// ---------------------------------------------------------------------------

// Keyword search for TikTok posts. `offset`/`cursor` paginate. Photo-mode
// posts (slideshows) come back in the same feed as videos; filter client-side
// on the image fields.
export function searchTikTokPosts(keyword: string, cursor = 0, count = 20) {
  return tikhubGet("api/v1/tiktok/web/fetch_search_video", {
    keyword,
    offset: cursor,
    count,
  });
}

// Full detail for a single post by its aweme/video id -- captions, stats,
// music, and (for slideshows) the image list.
export function fetchTikTokPost(awemeId: string) {
  return tikhubGet("api/v1/tiktok/web/fetch_one_video", { aweme_id: awemeId });
}

// A creator's recent posts, for studying accounts that post slideshows.
export function fetchTikTokUserPosts(secUid: string, cursor = 0, count = 20) {
  return tikhubGet("api/v1/tiktok/web/fetch_user_post", {
    secUid,
    cursor,
    count,
  });
}
