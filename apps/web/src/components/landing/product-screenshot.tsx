import { Reveal } from "@/components/reveal";

export function ProductScreenshot() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <Reveal className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/50" />
          <span className="size-2.5 rounded-full bg-spark/60" />
          <span className="size-2.5 rounded-full bg-riot/50" />
          <span className="ml-3 rounded-2xl bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
            viraltiktokslideshows.com
          </span>
        </div>
        <div className="bg-muted/30 p-2 sm:p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preview/Product-preview.png"
            alt="The Viral TikTok Slideshows generator in action"
            className="w-full rounded-xl"
          />
        </div>
      </Reveal>
    </section>
  );
}
