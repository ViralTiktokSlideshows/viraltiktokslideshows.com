import { Reveal } from "@/components/reveal";

export function QuoteBand() {
  return (
    <section className="bg-void px-4 py-16 sm:px-6 sm:py-20">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="font-display text-xl leading-snug font-semibold text-balance text-bone sm:text-2xl md:text-3xl">
          Slideshows are the highest-reach format on TikTok right now &mdash; and the slowest to
          make. An hour in Canva for something the algorithm decides on in{" "}
          <span className="text-spark">0.5 seconds</span>.
        </p>
        <p className="mt-5 text-sm text-bone/50 sm:text-base">
          The 0.5 seconds is the hook slide. That&apos;s what we&apos;re built for.
        </p>
      </Reveal>
    </section>
  );
}
