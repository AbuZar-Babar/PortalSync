'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Layers } from 'lucide-react';

interface HeroProductShowcaseProps {
  onOpenVideoModal: () => void;
}

export default function HeroProductShowcase({ onOpenVideoModal }: HeroProductShowcaseProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'simulator'>('video');
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  const toggleVideoSound = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsVideoMuted(nextMuted);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto my-8">
      {/* Ambient Multi-Layer Background Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-cyan-500/15 to-purple-500/20 rounded-[2.5rem] blur-3xl -z-10 pointer-events-none opacity-80" />
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-cyan-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />

      {/* Main Studio Frame */}
      <div className="rounded-3xl bg-[#09090d]/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-xl relative">
        {/* Browser Top Navigation & Tab Bar */}
        <div className="bg-[#0e0e14] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          {/* Window Controls */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
          </div>

          {/* Mode Switcher Tabs: Video Demo vs Interactive Simulator */}
          <div className="inline-flex p-1 rounded-full bg-zinc-950 border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'video'
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Real Demo Video</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Step-by-Step Simulator</span>
            </button>
          </div>

          {/* Browser Address Pill */}
          <div className="hidden md:flex items-center gap-2 bg-[#050508] text-zinc-400 text-xs px-3.5 py-1 rounded-full border border-white/10 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="truncate max-w-[200px] text-zinc-300">app.reflow.ai/invoices</span>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            {activeTab === 'video' && (
              <>
                <button
                  type="button"
                  onClick={toggleVideoSound}
                  className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono border border-white/10 flex items-center gap-1 transition cursor-pointer"
                  title={isVideoMuted ? 'Turn Sound On' : 'Mute'}
                >
                  {isVideoMuted ? <VolumeX className="w-3 h-3 text-zinc-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                  <span className="text-[11px]">{isVideoMuted ? 'Muted' : 'Sound'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleVideoPlay}
                  className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer"
                  title={isVideoPlaying ? 'Pause Video' : 'Play Video'}
                >
                  {isVideoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onOpenVideoModal}
              className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer"
              title="Expand Fullscreen (0:30 HD)"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Surface Content */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-black overflow-hidden flex items-center justify-center">
          {/* TAB 1: Live Video Demo */}
          {activeTab === 'video' && (
            <div className="relative w-full h-full flex items-center justify-center bg-black group">
              <video
                ref={videoRef}
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              >
                <source src="/videos/landing-demo.mp4" type="video/mp4" />
              </video>

              {/* Bottom Subtle Overlay Bar */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-white">Genuine Chrome Recording &rarr; 24x Replay</span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400">Duration: 30s</span>
              </div>
            </div>
          )}

          {/* TAB 2: Synchronized Interactive Simulator */}
          {activeTab === 'simulator' && (
            <div className="w-full h-full p-6 sm:p-8 bg-[#07070a] select-none relative flex flex-col justify-between overflow-hidden">
              {/* Simulator Action Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">Invoice Export Workflow</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Automating portal downloads and skipping duplicate files</p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="animate-filter-btn px-3 py-1.5 rounded-lg border border-white/15 bg-zinc-900 text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                    <span>Filter: Date &gt;= 2026-01</span>
                  </div>
                  <div className="animate-input-field px-3 py-1.5 rounded-lg border border-white/15 bg-zinc-900 text-xs font-mono text-zinc-300 flex items-center gap-1.5 min-w-[150px]">
                    <span className="text-zinc-500">ID:</span>
                    <span className="animate-typing-text text-white font-semibold font-mono">INV-2026-Q3</span>
                    <span className="w-1 h-3 bg-white inline-block animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Minimal Data Table */}
              <div className="rounded-xl border border-white/10 bg-[#0a0a0e] overflow-hidden my-3">
                <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-zinc-950/80 border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  <div className="col-span-3">INVOICE BATCH</div>
                  <div className="col-span-3">VENDOR / ACCOUNT</div>
                  <div className="col-span-2">AMOUNT</div>
                  <div className="col-span-2">STATUS</div>
                  <div className="col-span-2 text-right">ACTION</div>
                </div>

                <div className="divide-y divide-white/5 text-xs font-mono">
                  {/* Row 1 */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-2.5 items-center text-zinc-400">
                    <div className="col-span-3 text-zinc-300">#INV-8491</div>
                    <div className="col-span-3 text-zinc-400">Stripe Billing Services</div>
                    <div className="col-span-2 text-zinc-300">$1,240.00</div>
                    <div className="col-span-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">Processed</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-[11px] text-zinc-500">Done ✓</span>
                    </div>
                  </div>

                  {/* Row 2: Target Row */}
                  <div className="animate-table-row-highlight grid grid-cols-12 gap-3 px-5 py-2.5 items-center bg-white/[0.03]">
                    <div className="col-span-3 text-white font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>#INV-8492</span>
                    </div>
                    <div className="col-span-3 text-zinc-200">AWS Enterprise Cloud</div>
                    <div className="col-span-2 text-white font-bold">$4,892.50</div>
                    <div className="col-span-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        Ready
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        type="button"
                        className="animate-export-btn px-3 py-1 rounded bg-white text-zinc-950 text-[11px] font-bold shadow-sm"
                      >
                        Export ↗
                      </button>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-2.5 items-center text-zinc-400">
                    <div className="col-span-3 text-zinc-300">#INV-8493</div>
                    <div className="col-span-3 text-zinc-400">Figma Organization</div>
                    <div className="col-span-2 text-zinc-300">$750.00</div>
                    <div className="col-span-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">In Queue</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-[11px] text-zinc-500">Queued</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Checkmark Notification */}
              <div className="animate-saved-checkmark absolute top-1/2 left-1/2 z-30 px-6 py-4 rounded-xl bg-zinc-900 border border-white/20 shadow-2xl flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center font-bold text-sm mb-2 shadow-sm">
                  ✓
                </div>
                <span className="text-xs font-bold text-white">Workflow Learned &amp; Saved</span>
                <span className="text-[10px] font-mono text-zinc-400 mt-0.5">Self-healing recipe ready for replay</span>
              </div>

              {/* Simulated Moving Cursor */}
              <div className="animate-saas-cursor absolute top-0 left-0 pointer-events-none z-40">
                <svg className="w-5 h-5 text-white filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.438z" />
                </svg>
              </div>

              {/* Replay Footer Bar */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Phase: Autonomous Replay (24x Speed)</span>
                <span className="text-emerald-400 font-bold">100% Verified</span>
              </div>
            </div>
          )}
        </div>

        {/* 3 User-Friendly Highlights Below Frame */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10 bg-[#0e0e14] border-t border-white/10 text-xs">
          <div className="p-4 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
              ✓
            </span>
            <div>
              <p className="font-bold text-white">Zero Coding Required</p>
              <p className="text-[11px] text-zinc-400">If you can browse a website, you can automate it.</p>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
              ⚡
            </span>
            <div>
              <p className="font-bold text-white">Runs 24x Faster</p>
              <p className="text-[11px] text-zinc-400">Replays your exact steps without human lag.</p>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 shrink-0">
              🛡️
            </span>
            <div>
              <p className="font-bold text-white">Adapts When Sites Change</p>
              <p className="text-[11px] text-zinc-400">Auto-spots new buttons so runs never break.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
