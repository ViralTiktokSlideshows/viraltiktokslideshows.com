const BACK_CARDS = [
  { seed: "vts-deck-1", label: "SLIDE 4", rotate: -14, x: -78, y: 6, z: 10 },
  { seed: "vts-deck-2", label: "SLIDE 3", rotate: -6, x: -34, y: 2, z: 20 },
  { seed: "vts-deck-3", label: "SLIDE 2", rotate: 10, x: 56, y: 4, z: 15 },
] as const;

export function SlideDeck() {
  return (
    <div className="relative mx-auto h-[280px] w-full max-w-sm sm:h-[320px] md:h-[360px]">
      {BACK_CARDS.map((card) => (
        <div
          key={card.label}
          className="absolute top-1/2 left-1/2 w-[128px] overflow-hidden rounded-2xl border border-border/70 shadow-lg sm:w-[144px] md:w-[164px]"
          style={{
            zIndex: card.z,
            transform: `translate(-50%, -50%) translate(${card.x}px, ${card.y}px) rotate(${card.rotate}deg)`,
          }}
        >
          <div className="relative aspect-9/16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://picsum.photos/seed/${card.seed}/400/711`}
              alt=""
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-void/40" />
            <span className="absolute top-3 left-3 font-mono text-[9px] tracking-widest text-white/80 uppercase">
              {card.label}
            </span>
          </div>
        </div>
      ))}

      <div
        className="absolute top-1/2 left-1/2 w-[150px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:w-[168px] md:w-[190px]"
        style={{ zIndex: 30, transform: "translate(-50%, -50%)" }}
      >
        <div className="relative flex aspect-9/16 flex-col justify-between p-3.5">
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            Slide 1
          </span>
          <p className="font-display text-lg leading-[1.15] font-semibold text-foreground sm:text-xl">
            POV: you stopped making slideshows by hand
          </p>
        </div>
      </div>
    </div>
  );
}
