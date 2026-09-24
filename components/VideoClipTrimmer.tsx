'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Download, Clock, Scissors, Play, Pause } from 'lucide-react';

interface VideoClipTrimmerProps {
  videoUrl: string;
  youtubeId?: string | null;
  initialStart?: number;
  initialEnd?: number;
  onClipChange: (range: { start: number; end: number; formatted: string }) => void;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VideoClipTrimmer({
  videoUrl,
  youtubeId,
  initialStart = 0,
  initialEnd = 30,
  onClipChange,
}: VideoClipTrimmerProps) {
  const [startSec, setStartSec] = useState(initialStart);
  const [endSec, setEndSec] = useState(Math.min(initialStart + 90, Math.max(initialStart + 10, initialEnd)));
  const [videoDuration, setVideoDuration] = useState(300); // default 5 mins
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const clipDuration = Math.max(1, endSec - startSec);

  // Sync to parent when start/end changes
  useEffect(() => {
    const formatted = `[⏱️ ${formatTime(startSec)} - ${formatTime(endSec)}]`;
    onClipChange({
      start: startSec,
      end: endSec,
      formatted,
    });
  }, [startSec, endSec, onClipChange]);

  const handleStartChange = (val: number) => {
    const clampedStart = Math.max(0, Math.min(val, videoDuration - 1));
    setStartSec(clampedStart);
    if (endSec <= clampedStart) {
      setEndSec(Math.min(clampedStart + 30, videoDuration));
    } else if (endSec - clampedStart > 90) {
      setEndSec(clampedStart + 90);
    }
  };

  const handleEndChange = (val: number) => {
    let clampedEnd = Math.max(startSec + 1, Math.min(val, videoDuration));
    if (clampedEnd - startSec > 90) {
      clampedEnd = startSec + 90;
    }
    setEndSec(clampedEnd);
  };

  const setPreset = (duration: number) => {
    const newEnd = Math.min(startSec + duration, videoDuration);
    setEndSec(newEnd);
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--border))]/20 p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FFD21A]/20 text-black dark:text-[#FFD21A]">
            <Film className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[hsl(var(--foreground))] tracking-wide">
            90s Video Clip Trimmer
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFD21A] text-black font-mono text-xs font-bold shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTime(startSec)} - {formatTime(endSec)} ({clipDuration}s)</span>
        </div>
      </div>

      {/* Video Preview */}
      <div className="rounded-lg overflow-hidden bg-black border border-[hsl(var(--border))] relative aspect-video flex items-center justify-center">
        {youtubeId ? (
          <iframe
            key={`${youtubeId}-${startSec}-${endSec}`}
            src={`https://www.youtube.com/embed/${youtubeId}?start=${startSec}&end=${endSec}&autoplay=0&controls=1&rel=0`}
            title="YouTube Clip Preview"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={`${videoUrl}#t=${startSec},${endSec}`}
            controls
            playsInline
            onLoadedMetadata={(e) => {
              const dur = (e.target as HTMLVideoElement).duration;
              if (dur && !isNaN(dur)) setVideoDuration(Math.floor(dur));
            }}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Scrubber Controls */}
      <div className="space-y-3 pt-1">
        {/* Dual Range Labels */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[hsl(var(--text-muted))]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FFD21A]"></span>
            Start: <strong className="text-[hsl(var(--foreground))]">{formatTime(startSec)}</strong>
          </span>
          <span className="flex items-center gap-1">
            End: <strong className="text-[hsl(var(--foreground))]">{formatTime(endSec)}</strong>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FFD21A]"></span>
          </span>
        </div>

        {/* Visual Dual-slider Track */}
        <div className="relative pt-1 pb-2">
          <div className="h-2 rounded-full bg-[hsl(var(--border))] relative overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-[#FFD21A] rounded-full"
              style={{
                left: `${(startSec / videoDuration) * 100}%`,
                width: `${((endSec - startSec) / videoDuration) * 100}%`,
              }}
            />
          </div>

          {/* Slider 1: Start Handle */}
          <input
            type="range"
            min={0}
            max={videoDuration}
            value={startSec}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="absolute top-0 left-0 w-full opacity-70 accent-[#FFD21A] cursor-pointer h-4"
            title={`Clip Start: ${formatTime(startSec)}`}
          />

          {/* Slider 2: End Handle */}
          <input
            type="range"
            min={0}
            max={videoDuration}
            value={endSec}
            onChange={(e) => handleEndChange(Number(e.target.value))}
            className="absolute top-0 left-0 w-full opacity-70 accent-[#FFD21A] cursor-pointer h-4"
            title={`Clip End: ${formatTime(endSec)}`}
          />
        </div>

        {/* Quick Presets & Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[hsl(var(--text-muted))] font-medium">Quick Length:</span>
            {[15, 30, 60, 90].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setPreset(dur)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  clipDuration === dur
                    ? 'bg-[#FFD21A] text-black shadow-sm font-bold'
                    : 'bg-[hsl(var(--background))] hover:bg-[hsl(var(--border))]/50 text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {youtubeId ? (
              <a
                href={`https://youtube.com/watch?v=${youtubeId}&t=${startSec}s`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(var(--background))] hover:bg-[hsl(var(--border))]/50 text-[hsl(var(--foreground))] text-xs font-semibold border border-[hsl(var(--border))] transition"
              >
                <Scissors className="w-3.5 h-3.5 text-[#FFD21A]" />
                <span>Open at {formatTime(startSec)}</span>
              </a>
            ) : (
              <a
                href={videoUrl}
                download={`annotated_clip_${startSec}_${endSec}.mp4`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(var(--background))] hover:bg-[hsl(var(--border))]/50 text-[hsl(var(--foreground))] text-xs font-semibold border border-[hsl(var(--border))] transition"
              >
                <Download className="w-3.5 h-3.5 text-[#FFD21A]" />
                <span>Download Clip</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
