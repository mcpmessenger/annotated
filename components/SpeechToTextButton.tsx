"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  className?: string;
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md";
}

export function SpeechToTextButton({
  onTranscript,
  currentValue = "",
  className = "",
  showLabel = false,
  label = "Dictate",
  size = "md",
}: SpeechToTextButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const baseValueRef = useRef("");
  const accumulatedFinalRef = useRef("");
  const currentRunFinalRef = useRef("");
  const errorCountRef = useRef(0);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check support on mount
  useEffect(() => {
    const hasSpeech = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setIsSupported(hasSpeech);
  }, []);

  // Sync isListening to ref for callback handlers
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const cleanup = useCallback((notify = true) => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.abort();
      } catch (_) {}
    }
    setIsListening(false);
    isListeningRef.current = false;
    if (notify) {
      setTimeout(() => setStatusMsg(null), 2500);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup(false);
    };
  }, [cleanup]);

  const startRecognition = useCallback(async () => {
    if (typeof window === "undefined") return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setStatusMsg("Speech recognition is not supported in this browser.");
      return;
    }

    // Capture initial text state
    let base = currentValue || "";
    if (base && !base.endsWith(" ") && !base.endsWith("\n")) {
      base += " ";
    }
    baseValueRef.current = base;
    accumulatedFinalRef.current = "";
    currentRunFinalRef.current = "";
    errorCountRef.current = 0;
    setIsListening(true);
    isListeningRef.current = true;
    setStatusMsg("🎙️ Mic active… listening");

    // Check / prompt mic permissions gracefully
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        console.warn("[SpeechToText] Mic getUserMedia error:", err);
        cleanup(false);
        setStatusMsg("Microphone permission denied. Allow mic access to dictate.");
        setTimeout(() => setStatusMsg(null), 4000);
        return;
      }
    }

    const initSession = () => {
      if (!isListeningRef.current) return;

      try {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || "en-US";

        recognition.onstart = () => {
          setStatusMsg("🎙️ Listening… speak now");
        };

        recognition.onresult = (event: any) => {
          errorCountRef.current = 0;
          let runFinal = "";
          let interim = "";

          for (let i = 0; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              runFinal += item[0].transcript + " ";
            } else {
              interim += item[0].transcript;
            }
          }
          currentRunFinalRef.current = runFinal;
          const fullResult = (
            baseValueRef.current +
            accumulatedFinalRef.current +
            currentRunFinalRef.current +
            interim
          ).trimStart();

          onTranscript(fullResult);
        };

        recognition.onerror = (event: any) => {
          console.warn("[SpeechToText] onerror:", event.error);
          if (event.error === "aborted") return;
          if (event.error === "no-speech") return; // Silence pause: do not terminate

          errorCountRef.current++;
          if (event.error === "not-allowed") {
            cleanup(false);
            setStatusMsg("Microphone access blocked. Click lock icon in URL bar to allow.");
            setTimeout(() => setStatusMsg(null), 5000);
          } else if (errorCountRef.current > 2) {
            cleanup(false);
            setStatusMsg(`Dictation paused (${event.error})`);
            setTimeout(() => setStatusMsg(null), 4000);
          }
        };

        recognition.onend = () => {
          accumulatedFinalRef.current += currentRunFinalRef.current;
          currentRunFinalRef.current = "";

          if (isListeningRef.current && errorCountRef.current <= 2) {
            restartTimerRef.current = setTimeout(() => {
              if (isListeningRef.current) initSession();
            }, 250);
            return;
          }

          cleanup(true);
        };

        recognition.start();
      } catch (err: any) {
        console.error("[SpeechToText] Failed to start recognition:", err);
        cleanup(false);
        setStatusMsg("Could not start speech recognition.");
        setTimeout(() => setStatusMsg(null), 4000);
      }
    };

    initSession();
  }, [cleanup, currentValue, onTranscript]);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      cleanup(true);
      setStatusMsg("Dictation stopped");
      setTimeout(() => setStatusMsg(null), 2000);
    } else {
      startRecognition();
    }
  };

  if (!isSupported) {
    return null;
  }

  const isSmall = size === "sm";

  return (
    <div className="inline-flex items-center gap-2">
      <Tooltip
        content={isListening ? "Listening… Click to finish dictation" : "Dictate with voice (Speech to Text)"}
        position="top"
      >
        <button
          type="button"
          onClick={toggleListening}
          className={`relative inline-flex items-center justify-center gap-1.5 border font-medium transition-all cursor-pointer ${
            isSmall ? "p-1.5 text-xs rounded-md" : "px-3 py-2 text-sm rounded-[6px]"
          } ${
            isListening
              ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 ring-2 ring-red-500/30 shadow-xs animate-pulse"
              : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))] shadow-2xs"
          } ${className}`}
          aria-label={isListening ? "Stop speech dictation" : "Start speech dictation"}
          aria-pressed={isListening}
        >
          {isListening ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <Mic className="w-3.5 h-3.5 text-red-500 animate-bounce" />
              {showLabel && <span className="text-red-600 dark:text-red-400 font-semibold">Listening…</span>}
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              {showLabel && <span>{label}</span>}
            </>
          )}
        </button>
      </Tooltip>

      {statusMsg && (
        <span
          className={`text-[11px] font-medium animate-in fade-in duration-200 transition-all ${
            statusMsg.includes("denied") || statusMsg.includes("blocked") || statusMsg.includes("error")
              ? "text-red-500"
              : "text-[hsl(var(--accent))]"
          }`}
        >
          {statusMsg}
        </span>
      )}
    </div>
  );
}
