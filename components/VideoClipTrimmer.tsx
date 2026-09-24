'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Play, Pause, Download, Clock, Scissors } from 'lucide-react';

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
  const [videoDuration, setVideoDuration] = useState(300); // default 5 mins if unknown
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedClip, setCopiedClip] = useState(false);
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
    // Keep end within 90s, and at least start + 1
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
    <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Film className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            90s Video Clip Trimmer
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTime(startSec)} - {formatTime(endSec)} ({clipDuration}s / max 90s)</span>
        </div>
      </div>

      {/* Video Preview */}
      <div className="rounded-xl overflow-hidden bg-black border border-slate-800 relative aspect-video flex items-center justify-center">
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
        {/* Dual Range Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              Start: <strong className="text-amber-300">{formatTime(startSec)}</strong>
            </span>
            <span className="flex items-center gap-1">
              End: <strong className="text-amber-300">{formatTime(endSec)}</strong>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            </span>
          </div>

          {/* Visual Dual-slider */}
          <div className="relative pt-1 pb-2">
            <div className="h-2 rounded-full bg-slate-800 relative overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
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
              className="absolute top-0 left-0 w-full opacity-70 accent-amber-400 cursor-pointer h-4"
              title={`Clip Start: ${formatTime(startSec)}`}
            />

            {/* Slider 2: End Handle */}
            <input
              type="range"
              min={0}
              max={videoDuration}
              value={endSec}
              onChange={(e) => handleEndChange(Number(e.target.value))}
              className="absolute top-0 left-0 w-full opacity-70 accent-amber-400 cursor-pointer h-4"
              title={`Clip End: ${formatTime(endSec)}`}
            />
          </div>
        </div>

        {/* Quick Presets & Download Button */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Quick Length:</span>
            {[15, 30, 60, 90].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setPreset(dur)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  clipDuration === dur
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Open at {formatTime(startSec)}</span>
              </a>
            ) : (
              <a
                href={videoUrl}
                download={`annotated_clip_${startSec}_${endSec}.mp4`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Clip</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
