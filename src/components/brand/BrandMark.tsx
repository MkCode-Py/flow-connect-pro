export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--node-question))" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="hsl(var(--surface-2))" />
        <path d="M16 44 V20 L24 28 L32 20 L32 44" fill="none" stroke="url(#bm)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="44" cy="22" r="4" fill="url(#bm)" />
        <circle cx="44" cy="42" r="4" fill="url(#bm)" />
        <path d="M44 26 V38" stroke="url(#bm)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="font-display font-semibold text-base tracking-tight">MK Flow</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">WhatsApp</span>
      </div>
    </div>
  );
}
