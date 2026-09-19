"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";

interface TextToSpeechButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function TextToSpeechButton({
  text,
  className = "",
  size = "sm",
  showLabel = false,
}: TextToSpeechButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const toggleSpeak = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSupported || !text) return;

    if (isSpeaking) {
      stopSpeaking();
    } else {
      window.speechSynthesis.cancel(); // Stop any other audio

      const cleanText = text.replace(/https?:\/\/\S+/g, "").trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;
      utterance.lang = "en-US";
      utterance.rate = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isSupported || !text) return null;

  const isSmall = size === "sm";

  return (
    <Tooltip
      content={isSpeaking ? "Stop listening (Text to Speech)" : "Listen aloud (Text to Speech)"}
      position="top"
    >
      <button
        type="button"
        onClick={toggleSpeak}
        className={`inline-flex items-center justify-center gap-1 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors cursor-pointer ${
          isSmall ? "p-1 text-xs" : "px-2 py-1 text-xs"
        } ${
          isSpeaking ? "text-[hsl(var(--accent))] bg-[hsl(var(--border))] font-semibold" : ""
        } ${className}`}
        aria-label={isSpeaking ? "Stop speech" : "Read text aloud"}
        aria-pressed={isSpeaking}
      >
        {isSpeaking ? (
          <VolumeX className="w-3.5 h-3.5 text-[hsl(var(--accent))] animate-pulse" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
        {showLabel && <span>{isSpeaking ? "Stop" : "Listen"}</span>}
      </button>
    </Tooltip>
  );
}
