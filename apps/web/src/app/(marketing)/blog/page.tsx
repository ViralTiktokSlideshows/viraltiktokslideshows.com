import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { EmptyIllustration } from "@/components/dashboard/empty-illustration";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on what makes a TikTok slideshow go viral, product updates, and how viraltiktokslideshows is built.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Blog</h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
        Deep dives on hook structure, slide pacing, and what the playbook picks up on — plus
        product updates as they ship.
      </p>

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
    </main>
  );
}
