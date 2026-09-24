'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Edit3 } from 'lucide-react';

export function SelectionAnnotatePopup() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === '/share') {
      setPosition(null);
      return;
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setPosition(null);
        setSelectedText('');
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 3 || text.length > 2000) {
        setPosition(null);
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect && (rect.width > 0 || rect.height > 0)) {
          const top = rect.top < 60 ? rect.bottom + 10 : rect.top - 46;
          const left = Math.max(16, Math.min(window.innerWidth - 120, rect.left + rect.width / 2 - 50));

          setSelectedText(text);
          setPosition({
            top: top + window.scrollY,
            left: left + window.scrollX,
          });
        }
      } catch (_) {
        setPosition(null);
      }
    };

    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
        return;
      }
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setPosition(null);
          setSelectedText('');
        }
      }, 150);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchstart', handleDocumentClick);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
    };
  }, [pathname]);

  if (!position || !selectedText) return null;

  const handleAnnotateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetUrl = window.location.href;
    const pageTitle = document.title || 'Annotated Page';

    const params = new URLSearchParams({
      url: targetUrl,
      title: pageTitle,
      text: selectedText,
    });

    setPosition(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();

    router.push(`/share?${params.toString()}`);
  };

  return (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999,
      }}
      className="animate-in fade-in zoom-in-95 duration-150"
    >
      <button
        onClick={handleAnnotateClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffd21a] hover:bg-[#ffe053] text-black font-bold text-xs shadow-xl border border-black/10 active:scale-95 transition-transform cursor-pointer select-none"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span>Annotate</span>
      </button>
    </div>
  );
}
