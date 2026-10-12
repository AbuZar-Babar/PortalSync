'use client';

const TICKER_ITEMS = [
  'Works in Google Chrome',
  'No Extensions Needed',
  'Never Breaks on Site Changes',
  '100% Automatic Replay',
  'Works in Google Chrome',
  'No Extensions Needed',
  'Never Breaks on Site Changes',
  '100% Automatic Replay',
];

export default function RunningTicker() {
  return (
    <div
      className="w-screen relative left-1/2 -translate-x-1/2 my-8 border-y border-white/10 bg-[#060609]/90 backdrop-blur-md py-3.5 overflow-hidden select-none"
      aria-label="Key Product Guarantees"
    >
      {/* Edge gradient fade masks */}
      <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#050507] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#050507] to-transparent z-10 pointer-events-none" />

      {/* Marquee Track */}
      <div className="flex items-center gap-8 w-max animate-running-ticker">
        {/* Track 1 */}
        <div className="flex items-center gap-8 shrink-0">
          {TICKER_ITEMS.map((item, idx) => (
            <div
              key={`ticker-1-${idx}`}
              className="flex items-center gap-8 shrink-0 font-mono text-xs sm:text-[13px] font-bold tracking-widest uppercase text-zinc-300"
            >
              <span className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </span>
              <span className="text-zinc-600 text-xs select-none">✦</span>
            </div>
          ))}
        </div>

        {/* Track 2 (Identical clone for seamless infinite loop) */}
        <div className="flex items-center gap-8 shrink-0" aria-hidden="true">
          {TICKER_ITEMS.map((item, idx) => (
            <div
              key={`ticker-2-${idx}`}
              className="flex items-center gap-8 shrink-0 font-mono text-xs sm:text-[13px] font-bold tracking-widest uppercase text-zinc-300"
            >
              <span className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </span>
              <span className="text-zinc-600 text-xs select-none">✦</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
