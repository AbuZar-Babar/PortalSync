'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Volume2, VolumeX, Play, Maximize2 } from 'lucide-react';

interface VideoDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoDemoModal({ isOpen, onClose }: VideoDemoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Fallback to muted if browser blocks unmuted autoplay
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    } else if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen, isMuted]);

  if (!isOpen) return null;

  const toggleSound = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="FlowMind Video Demo Modal"
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl bg-slate-900 border border-cyan-400/30 shadow-[0_25px_80px_-15px_rgba(0,240,255,0.25)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
              FlowMind Robotic Workflow Demo
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 hidden sm:inline-block">
              24x Autonomous Replay
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              type="button"
              className="px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="text-[11px]">{isMuted ? 'Muted' : 'Sound On'}</span>
            </button>

            <button
              onClick={toggleFullscreen}
              type="button"
              className="p-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer hidden sm:flex"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-full bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-400/40 transition cursor-pointer"
              title="Close Modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Surface */}
        <div className="relative aspect-video bg-black flex items-center justify-center group">
          <video
            ref={videoRef}
            src="/videos/landing-demo.mp4"
            className="w-full h-full object-contain"
            controls
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-2xl transition hover:scale-110 cursor-pointer"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}
        </div>

        {/* Modal Footer Description */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>Demonstration: Human demonstration in Google Chrome &rarr; Instant 24x Replay with self-healing DOM selectors.</span>
          <span className="text-cyan-400 font-mono text-[11px]">Duration ~30s &middot; High-Definition 1080p</span>
        </div>
      </div>
    </div>
  );
}
