"use client";

import {
  ArrowUpRight,
  Code2,
  Heart,
  Images,
  Loader2,
  MessageCircle,
  Play,
  Search,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Input } from "@viraltiktokslideshows/ui/components/input";
import { Textarea } from "@viraltiktokslideshows/ui/components/textarea";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { useSession } from "@/lib/auth-client";
import {
  formatCount,
  searchTikTok,
  tikhubProxy,
  type TikTokPost,
} from "@/lib/research-client";

type ContentFilter = "all" | "slideshow" | "video";

const SORT_OPTIONS = [
  { value: 0, label: "Relevance" },
  { value: 1, label: "Most liked" },
] as const;

const TIME_OPTIONS = [
  { value: 0, label: "All time" },
  { value: 1, label: "Past day" },
  { value: 7, label: "Past week" },
  { value: 30, label: "Past month" },
  { value: 90, label: "Past 3 months" },
  { value: 180, label: "Past 6 months" },
] as const;

function StatChip({ icon: Icon, value }: { icon: typeof Play; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {formatCount(value)}
    </span>
  );
}

function PostCard({ post }: { post: TikTokPost }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Images className="size-8" />
          </div>
        )}
        {post.isSlideshow ? (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-void/80 px-2 py-1 text-[11px] font-semibold text-bone">
            <Images className="size-3" />
            {post.imageCount} slides
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-3 text-sm text-foreground">{post.caption || "—"}</p>
        <p className="text-xs text-muted-foreground">
          {post.authorName}
          {post.authorHandle ? ` · @${post.authorHandle}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <StatChip icon={Play} value={post.playCount} />
          <StatChip icon={Heart} value={post.likeCount} />
          <StatChip icon={MessageCircle} value={post.commentCount} />
          <StatChip icon={Share2} value={post.shareCount} />
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open on TikTok
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const { user, isPending } = useSession();

  // --- structured search state ---
  const [keyword, setKeyword] = useState("");
  const [count, setCount] = useState(20);
  const [sortType, setSortType] = useState(0);
  const [publishTime, setPublishTime] = useState(0);
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [posts, setPosts] = useState<TikTokPost[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [searchError, setSearchError] = useState("");
  const [lastRaw, setLastRaw] = useState<unknown>(null);

  // --- raw request console state ---
  const [showRaw, setShowRaw] = useState(false);
  const [rawEndpoint, setRawEndpoint] = useState("api/v1/tiktok/web/fetch_search_video");
  const [rawParams, setRawParams] = useState('{\n  "keyword": "slideshow",\n  "count": 10\n}');
  const [rawState, setRawState] = useState<"idle" | "loading">("idle");
  const [rawOutput, setRawOutput] = useState("");

  const filtered = useMemo(() => {
    if (filter === "slideshow") return posts.filter((p) => p.isSlideshow);
    if (filter === "video") return posts.filter((p) => !p.isSlideshow);
    return posts;
  }, [posts, filter]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!keyword.trim() || searchState === "loading") return;
    setSearchState("loading");
    setSearchError("");
    try {
      const { result, posts: found } = await searchTikTok({
        keyword: keyword.trim(),
        count,
        sortType,
        publishTime,
      });
      setLastRaw(result.data);
      if (!result.ok) {
        setSearchState("error");
        setSearchError(`TikHub returned ${result.status}. Check the raw console below.`);
        setPosts([]);
        return;
      }
      setPosts(found);
      setSearchState("idle");
      if (found.length === 0) {
        setSearchError("No posts parsed from the response — try the raw console to inspect it.");
      }
    } catch {
      setSearchState("error");
      setSearchError("Request failed. Are you signed in as an admin and is TIKHUB_API_KEY set?");
      setPosts([]);
    }
  }

  async function handleRaw(e?: React.FormEvent) {
    e?.preventDefault();
    if (rawState === "loading") return;
    setRawState("loading");
    let params: Record<string, string | number | boolean> = {};
    try {
      params = rawParams.trim() ? JSON.parse(rawParams) : {};
    } catch {
      setRawOutput("Invalid JSON in params.");
      setRawState("idle");
      return;
    }
    try {
      const result = await tikhubProxy(rawEndpoint.trim(), params);
      setRawOutput(
        `// status ${result.status}\n${JSON.stringify(result.data, null, 2)}`,
      );
    } catch {
      setRawOutput("Request failed.");
    }
    setRawState("idle");
  }

  // Admin guard: this whole surface is for the owner only.
  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user?.isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">Not available</h1>
        <p className="text-sm text-muted-foreground">This page is restricted.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Admin · TikHub
        </span>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          TikTok research
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Search TikTok for any terms and filter by post type. Slideshows (photo-mode carousels)
          are tagged with their slide count. Every call runs through your server with your TikHub
          key — nothing is exposed to the browser.
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. motivation slideshow, gym tips, book quotes…"
              className="pl-9"
            />
          </div>
          <Button type="submit" size="lg" disabled={searchState === "loading" || !keyword.trim()}>
            {searchState === "loading" ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Search className="size-4" data-icon="inline-start" />
            )}
            Search
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Sort
            <select
              value={sortType}
              onChange={(e) => setSortType(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Time
            <select
              value={publishTime}
              onChange={(e) => setPublishTime(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Count
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 20)))}
              className="h-8 w-16 px-2 text-xs"
            />
          </label>
        </div>
      </form>

      {/* Content-type filter */}
      {posts.length > 0 ? (
        <div className="mt-5 flex items-center gap-2">
          {(
            [
              { value: "all", label: `All (${posts.length})` },
              {
                value: "slideshow",
                label: `Slideshows (${posts.filter((p) => p.isSlideshow).length})`,
              },
              { value: "video", label: `Videos (${posts.filter((p) => !p.isSlideshow).length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === tab.value
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {searchError ? (
        <p className="mt-4 text-sm text-muted-foreground">{searchError}</p>
      ) : null}

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}

      {/* Raw request console */}
      <div className="mt-8 rounded-2xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setShowRaw((s) => !s)}
          className="flex w-full items-center gap-2 p-4 text-left text-sm font-medium text-foreground"
        >
          <Code2 className="size-4 text-muted-foreground" />
          Raw request console
          <span className="ml-auto text-xs text-muted-foreground">
            {showRaw ? "Hide" : "Show"}
          </span>
        </button>
        {showRaw ? (
          <form onSubmit={handleRaw} className="border-t border-border p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Call any TikHub endpoint. Path is appended to{" "}
              <code className="rounded bg-muted px-1">api.tikhub.io/</code>. Params are sent as the
              query string. See docs.tikhub.io for the full TikTok endpoint list.
            </p>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Endpoint</label>
            <Input
              value={rawEndpoint}
              onChange={(e) => setRawEndpoint(e.target.value)}
              placeholder="api/v1/tiktok/web/fetch_search_video"
              className="font-mono text-xs"
            />
            <label className="mt-3 mb-1 block text-xs font-medium text-muted-foreground">
              Params (JSON)
            </label>
            <Textarea
              value={rawParams}
              onChange={(e) => setRawParams(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
            <Button type="submit" size="sm" className="mt-3" disabled={rawState === "loading"}>
              {rawState === "loading" ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : null}
              Send request
            </Button>
            {rawOutput ? (
              <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-void p-3 font-mono text-[11px] leading-relaxed text-bone">
                {rawOutput}
              </pre>
            ) : null}
          </form>
        ) : null}
      </div>

      {/* Peek at the parsed response even when no cards rendered */}
      {lastRaw !== null && posts.length === 0 && !showRaw ? (
        <p className="mt-4 text-xs text-muted-foreground">
          A response came back but no posts were parsed. Open the raw console and re-run to inspect
          the exact shape.
        </p>
      ) : null}
    </div>
  );
}
