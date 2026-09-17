import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnotationCard } from "@/components/AnnotationCard";
import { getRecentAnnotations } from "@/lib/data";

export const revalidate = 0; // Don't cache this page so new annotations appear instantly

export default async function Home() {
  const featured = (await getRecentAnnotations()).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
          <div className="editorial-container">
            <div className="py-20 space-y-6">
              <h1 className="editorial-heading">
                Explore annotations that deepen understanding.
              </h1>
              <p className="editorial-subheading max-w-2xl">
                A public space to share commentary, questions, and insights about the web we read.
                Every annotation is an invitation to think deeper.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center px-6 py-3 rounded font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity w-full sm:w-auto"
                >
                  Explore Annotations
                </Link>
                <Link
                  href="/install"
                  className="inline-flex items-center justify-center px-6 py-3 rounded font-medium border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors w-full sm:w-auto"
                >
                  Install Extension
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Annotations */}
        <section className="editorial-container bg-[hsl(var(--background))]">
          <div className="py-16">
            <h2 className="text-2xl font-bold mb-8">Recently Shared</h2>
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-1">
              {featured.map((annotation) => (
                <AnnotationCard key={annotation.id} annotation={annotation} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/explore"
                className="inline-flex items-center text-[hsl(var(--accent))] font-medium hover:underline"
              >
                View all annotations ?
              </Link>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
          <div className="editorial-container py-16">
            <div className="grid sm:grid-cols-2 gap-12">
              <div>
                <h3 className="text-lg font-bold mb-3">How It Works</h3>
                <p className="text-[hsl(var(--text-muted))] leading-relaxed">
                  Install the Annotated extension, highlight text on any webpage, and share your
                  thoughts. Your annotations appear in your public profile and on this feed, ready
                  for discussion and discovery.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
