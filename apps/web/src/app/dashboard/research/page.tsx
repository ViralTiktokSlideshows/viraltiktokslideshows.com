"use client";

import {
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  FlaskConical,
  Heart,
  Images,
  Loader2,
  MessageCircle,
  Play,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Input } from "@viraltiktokslideshows/ui/components/input";
import { Textarea } from "@viraltiktokslideshows/ui/components/textarea";

import { useSession } from "@/lib/auth-client";
import {
  formatCount,
  searchTikTok,
  tikhubProxy,
  type TikTokPost,
} from "@/lib/research-client";

const EXAMPLE_TERMS = ["motivation", "gym tips", "book quotes", "glow up", "study tips", "money"];

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
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Images className="size-8" />
          </div>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-void/85 px-2 py-1 text-[11px] font-semibold text-spark backdrop-blur-sm">
          <Images className="size-3" />
          {post.imageCount}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm leading-snug text-foreground">{post.caption || "—"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {post.authorName}
          {post.authorHandle ? ` · @${post.authorHandle}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2">
          <StatChip icon={Play} value={post.playCount} />
          <StatChip icon={Heart} value={post.likeCount} />
          <StatChip icon={MessageCircle} value={post.commentCount} />
          <StatChip icon={Share2} value={post.shareCount} />
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          Open on TikTok
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

// Build-in-progress state, matching the generate flow's animated-card loader.
function SearchingState() {
  return (
    <div className="animate-in fade-in-0 mt-10 flex flex-col items-center py-10 text-center duration-500 ease-out">
      <div className="relative h-36 w-28">
        <div className="absolute inset-2 rounded-2xl bg-border" />
        <div className="absolute inset-0 animate-pulse rounded-2xl border border-border bg-gradient-to-br from-spark/40 via-spark/15 to-transparent shadow-lg" />
        <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5">
          <div className="h-2 w-3/4 rounded-2xl bg-spark/50" />
          <div className="h-2 w-1/2 rounded-2xl bg-spark/35" />
        </div>
      </div>
      <h2 className="mt-6 font-display text-xl font-bold text-foreground sm:text-2xl">
        Scanning TikTok for slideshows&hellip;
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Pulling photo-mode posts and filtering out the videos.
      </p>
      <div className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-2xl bg-border">
        <div className="h-full w-1/2 animate-pulse rounded-2xl bg-spark" />
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const { user, isPending } = useSession();

  // --- structured search state ---
  const [keyword, setKeyword] = useState("");
  const [count, setCount] = useState(20);
  const [posts, setPosts] = useState<TikTokPost[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [lastRaw, setLastRaw] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  // --- raw request console state ---
  const [showRaw, setShowRaw] = useState(false);
  const [rawEndpoint, setRawEndpoint] = useState("api/v1/tiktok/web/fetch_general_search");
  const [rawParams, setRawParams] = useState('{\n  "keyword": "slideshow",\n  "offset": 0\n}');
  const [rawState, setRawState] = useState<"idle" | "loading">("idle");
  const [rawOutput, setRawOutput] = useState("");

  async function runSearch(term: string) {
    const q = term.trim();
    if (!q || searchState === "loading") return;
    setHasSearched(true);
    setSearchState("loading");
    setSearchError("");
    try {
      const { result, posts: found } = await searchTikTok({ keyword: q, limit: count });
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
        setSearchError("No slideshows found for that term — try a broader keyword.");
      }
    } catch {
      setSearchState("error");
      setSearchError("Request failed. Are you signed in as an admin and is TIKHUB_API_KEY set?");
      setPosts([]);
    }
  }

  function handleExample(term: string) {
    setKeyword(term);
    runSearch(term);
  }

  // Copies every result as a tab-separated table (paste into a sheet or hand
  // to an assistant to analyze) — one row per slideshow, no manual transcribing.
  function copyData() {
    const header = ["slides", "views", "likes", "comments", "shares", "caption"].join("\t");
    const rows = posts.map((p) =>
      [
        p.imageCount,
        p.playCount,
        p.likeCount,
        p.commentCount,
        p.shareCount,
        (p.caption || "").replace(/\s+/g, " ").trim(),
      ].join("\t"),
    );
    navigator.clipboard.writeText([header, ...rows].join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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
      setRawOutput(`// status ${result.status}\n${JSON.stringify(result.data, null, 2)}`);
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

  const showResults = searchState !== "loading" && posts.length > 0;
  const showEmptyResult = searchState !== "loading" && hasSearched && posts.length === 0;
  const showInitial = !hasSearched && searchState !== "loading";

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-void text-spark sm:flex">
          <FlaskConical className="size-6" />
        </span>
        <div>
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Admin · TikHub
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
            TikTok slideshow research
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Pull real, viral slideshows by keyword to study what&apos;s working. Videos are filtered
            out — only photo-mode posts come back, tagged with their slide count. Every call runs
            through your server, so your TikHub key never touches the browser.
          </p>
        </div>
      </div>

      {/* Search form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(keyword);
        }}
        className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search any topic — motivation, gym tips, book quotes…"
              className="pl-9"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="gap-2"
            disabled={searchState === "loading" || !keyword.trim()}
          >
            {searchState === "loading" ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Search className="size-4" data-icon="inline-start" />
            )}
            Search
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Show up to
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 20)))}
              className="h-8 w-16 px-2 text-xs"
            />
            slideshows
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Try:</span>
            {EXAMPLE_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleExample(term)}
                disabled={searchState === "loading"}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Loading */}
      {searchState === "loading" ? <SearchingState /> : null}

      {/* Results */}
      {showResults ? (
        <>
          <div className="mt-6 flex items-center gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <Sparkles className="size-3.5 text-spark" />
              {posts.length} slideshow{posts.length === 1 ? "" : "s"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto gap-1.5"
              onClick={copyData}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" data-icon="inline-start" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" data-icon="inline-start" />
                  Copy data
                </>
              )}
            </Button>
          </div>
          <div className="animate-in fade-in-0 mt-3 grid grid-cols-2 gap-4 duration-500 sm:grid-cols-3 lg:grid-cols-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      ) : null}

      {/* Searched, nothing to show */}
      {showEmptyResult ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Search className="size-6" />
          </span>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            {searchError || "No slideshows found. Try a broader keyword."}
          </p>
          {lastRaw !== null ? (
            <button
              type="button"
              onClick={() => setShowRaw(true)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Inspect the raw response
            </button>
          ) : null}
        </div>
      ) : null}

      {/* First-run empty state */}
      {showInitial ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-void text-spark">
            <Sparkles className="size-7" />
          </span>
          <h2 className="mt-5 font-display text-xl font-bold text-foreground">
            Study what&apos;s already going viral
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Search a topic to pull real TikTok slideshows with their view, like, and save counts —
            the raw material for a “I analyzed 100 slideshows” post.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {EXAMPLE_TERMS.slice(0, 4).map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleExample(term)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Raw request console */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setShowRaw((s) => !s)}
          className="flex w-full items-center gap-2 p-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          <Code2 className="size-4 text-muted-foreground" />
          Raw request console
          <span className="ml-auto text-xs text-muted-foreground">{showRaw ? "Hide" : "Show"}</span>
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
              placeholder="api/v1/tiktok/web/fetch_general_search"
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
            <Button type="submit" size="sm" className="mt-3 gap-2" disabled={rawState === "loading"}>
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
    </div>
  );
}
