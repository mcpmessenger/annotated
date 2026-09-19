"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnotationCard } from "@/components/AnnotationCard";
import { SpeechToTextButton } from "@/components/SpeechToTextButton";
import { getRecentAnnotations } from "@/lib/data";
import { Annotation } from "@/lib/types";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRecentAnnotations().then((data) => {
      setAnnotations(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = annotations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.commentary.toLowerCase().includes(query) ||
          a.userDisplayName.toLowerCase().includes(query) ||
          a.sourceTitle.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [annotations, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
          <div className="editorial-container py-12">
            <h1 className="editorial-heading mb-2">Explore Annotations</h1>
            <p className="editorial-subheading">
              Browse annotations shared by our community. Search for topics, users, or domains.
            </p>
          </div>
        </section>

        {/* Search */}
        <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] sticky top-[65px] z-30">
          <div className="editorial-container py-4">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search annotations, users, sources (or speak)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-14 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
              />
              <div className="absolute right-2 flex items-center">
                <SpeechToTextButton
                  currentValue={searchQuery}
                  onTranscript={(transcription) => setSearchQuery(transcription)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="editorial-container py-12">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-6 h-6 border-2 border-[hsl(var(--accent))] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[hsl(var(--text-muted))] mb-2">No annotations found.</p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-[hsl(var(--accent))] font-medium hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-1 max-w-3xl mx-auto">
              {filtered.map((annotation) => (
                <AnnotationCard key={annotation.id} annotation={annotation} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
