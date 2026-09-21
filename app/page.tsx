import Link from "next/link";
import { Header } from "@/components/Header";
import { HomeFeed } from "@/components/HomeFeed";
import { getRecentAnnotations } from "@/lib/data";

export const revalidate = 0; // Don't cache this page so new annotations appear instantly

export default async function Home() {
  const annotations = await getRecentAnnotations();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
          <div className="editorial-container">
            <div className="py-16 sm:py-20 space-y-6">
              <h1 className="editorial-heading">
                The public annotation layer for the internet.
              </h1>
              <p className="editorial-subheading max-w-2xl">
                A public space to share commentary, questions, and insights about the web we read.
                Every annotation is an invitation to think deeper.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/install"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-[6px] font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity w-full sm:w-auto"
                >
                  Install Extension
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-[6px] font-medium border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors w-full sm:w-auto"
                >
                  Search & Explore
                </Link>
              </div>

              {/* Video Embed */}
              <div className="mt-12 relative w-full max-w-4xl rounded-[12px] overflow-hidden border border-[hsl(var(--border))] shadow-2xl bg-[hsl(var(--card))]">
                <div className="aspect-video">
                  <iframe 
                    src="https://www.youtube.com/embed/BbfvKGDYORY?autoplay=0&rel=0" 
                    title="Annotated Demo"
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Continuous Scrolling Feed with Relocated Sticky Sidebar Details */}
        <section className="bg-[hsl(var(--background))]">
          <HomeFeed initialAnnotations={annotations} />
        </section>
      </main>

      {/* Clean layout */}
    </div>
  );
}
