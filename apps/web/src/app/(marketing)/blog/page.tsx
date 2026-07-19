import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { EmptyIllustration } from "@/components/dashboard/empty-illustration";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — TikTok Slideshow Tips & Data",
  description:
    "Data-backed guides on what makes a TikTok slideshow go viral: hook structure, slide count, pacing, and hashtags — plus product updates.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Blog</h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
        Data-backed deep dives on hook structure, slide count, pacing, and hashtags — what actually
        separates a viral TikTok slideshow from one stuck at 200 views.
      </p>

      {posts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <EmptyIllustration />
          <h2 className="mt-6 font-display text-xl font-bold text-foreground">Nothing posted yet</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            The first posts are on the way. In the meantime, see the playbook in action for
            yourself.
          </p>
          <Button size="lg" className="mt-6" nativeButton={false} render={<Link href="/generate" />}>
            Generate a slideshow
          </Button>
        </div>
      ) : (
        <ul className="mt-12 flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border border-border bg-card p-6 transition hover:border-foreground/20 hover:shadow-sm"
              >
                <p className="text-[11px] font-semibold tracking-widest text-riot uppercase">
                  {post.tag}
                </p>
                <h2 className="mt-2 font-display text-xl font-bold text-foreground group-hover:underline">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={post.datePublished}>
                    {new Date(post.datePublished).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{post.readingTimeMinutes} min read</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
