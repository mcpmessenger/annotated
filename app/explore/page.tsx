"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnotationCard } from "@/components/AnnotationCard";
import { getRecentAnnotations, getAnnotationsByIntent } from "@/lib/data";
import { Annotation, Intent } from "@/lib/types";

const intentFilters: { value: Intent; label: string }[] = [
  { value: "all", label: "All Intents" },
  { value: "highlight", label: "Highlights" },
  { value: "question", label: "Questions" },
  { value: "critique", label: "Critiques" },
  { value: "expand", label: "Expansions" },
];

export default function ExplorePage() {
  const [activeIntent, setActiveIntent] = useState<Intent>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAnnotationsByIntent(activeIntent).then((data) => {
      setAnnotations(data);
      setLoading(false);
    });
  }, [activeIntent]);

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
        <section className="border-b border-[hsl(var(--border))] bg-white">
          <div className="editorial-container py-12">
            <h1 className="editorial-heading mb-2">Explore Annotations</h1>
            <p className="editorial-subheading">
              Browse annotations shared by our community. Filter by intent or search for topics.
            </p>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="border-b border-[hsl(var(--border))] bg-white sticky top-[65px] z-30">
          <div className="editorial-container py-4 space-y-4">
            <input
              type="text"
              placeholder="Search annotations, users, sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-[hsl(var(--border))] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
            />

            <div className="flex flex-wrap gap-2">
              {intentFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveIntent(filter.value)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeIntent === filter.value
                      ? "bg-[hsl(var(--foreground))] text-white"
                      : "border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-gray-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="editorial-container py-12">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[hsl(var(--text-muted))] mb-2">No annotations found.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveIntent("all");
                }}
                className="text-[hsl(var(--accent))] font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-[hsl(var(--text-subtle))]">
                {filtered.length} annotation{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-1">
                {filtered.map((annotation) => (
                  <AnnotationCard key={annotation.id} annotation={annotation} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
