"use client";

import { useState, useRef, ReactNode } from "react";

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
  delayMs = 150,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!content) return <>{children}</>;

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[position];

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute ${positionClasses} z-50 pointer-events-none whitespace-normal max-w-xs px-2.5 py-1.5 text-xs font-medium text-white bg-[#1c282f] dark:bg-[#141e24] rounded-md shadow-xl border border-white/10 animate-in fade-in zoom-in-95 duration-150 text-center leading-tight tracking-normal`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
