import { ScreenshotPlaceholder } from "./screenshot-placeholder";

export function ProductScreenshot() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/50" />
          <span className="size-2.5 rounded-full bg-spark/60" />
          <span className="size-2.5 rounded-full bg-riot/50" />
          <span className="ml-3 rounded-2xl bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
            viraltiktokslideshows.com
          </span>
        </div>
        <div className="p-6 sm:p-10">
          <ScreenshotPlaceholder
            label="Product screenshot — the generator in action"
            hint="1440 × 900 recommended"
            className="min-h-[260px] sm:min-h-[340px]"
          />
        </div>
      </div>
    </section>
  );
}
