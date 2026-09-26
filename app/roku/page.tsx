import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Annotated for Roku TV (Beta) - The Big Screen Experience",
  description: "Experience live video annotations, community notes, and real-time fact-checking on your television with the official Annotated Roku Channel.",
};

export default function RokuPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-4xl">
          {/* Badge & Title */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Public Beta
            </span>
            <span className="text-xs text-[hsl(var(--text-muted))]">Channel Code: 5HNKDDJ</span>
          </div>

          <h1 className="editorial-heading mb-4">Annotated for Roku TV</h1>
          <p className="editorial-subheading max-w-2xl mb-8">
            The community annotation layer, built for the living room. Watch video commentary, explore real-time fact checks, and react from your couch with your Roku remote.
          </p>

          {/* Primary Action Hero Card */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8 mb-12 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-xl font-bold">Add to Your Roku Account</h2>
                <p className="text-sm text-[hsl(var(--text-muted))] max-w-md">
                  Install the beta channel instantly to all Roku TVs and streaming players connected to your Roku account.
                </p>
                <div className="pt-1">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[hsl(var(--text-muted))]">
                    Channel Access Code:{" "}
                    <code className="px-2 py-0.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] font-mono text-[hsl(var(--foreground))] font-bold text-sm">
                      5HNKDDJ
                    </code>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <a
                  href="https://my.roku.com/add/5HNKDDJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity text-sm text-center shadow"
                >
                  Add Channel to Roku &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* Preview Showcase */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">The 10-Foot Experience</h2>
            <div className="rounded-xl overflow-hidden border border-[hsl(var(--border))] shadow-xl bg-black">
              <img
                src="/roku/roku-splash.png"
                alt="Annotated Roku TV Channel Interface"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Key Capabilities */}
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold mb-3">
                ⚡
              </div>
              <h3 className="font-bold mb-2">Live Fact-Checking</h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                See real-time community consensus banners (Verified, Disputed, or Caution) synchronized with video timelines.
              </p>
            </div>

            <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold mb-3">
                📺
              </div>
              <h3 className="font-bold mb-2">Lean-Back Remote UI</h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Navigate timestamps, read full commentary cards, and toggle views seamlessly using standard Roku D-pad controls.
              </p>
            </div>

            <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold mb-3">
                🔥
              </div>
              <h3 className="font-bold mb-2">Instant Remote Reactions</h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Upvote insights, react with Fire, Idea, or 100 badges, and submit community signals right from your TV remote.
              </p>
            </div>
          </div>

          {/* Step by Step Install Guide */}
          <section className="border-t border-[hsl(var(--border))] pt-10 mb-12">
            <h2 className="text-xl font-bold mb-6">How to Install on Your TV</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold mb-1">Click the Add Channel link</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    Visit{" "}
                    <a
                      href="https://my.roku.com/add/5HNKDDJ"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--foreground))] underline font-medium"
                    >
                      my.roku.com/add/5HNKDDJ
                    </a>{" "}
                    while signed into your Roku account.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold mb-1">Confirm the prompt</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    Roku will ask to confirm adding &quot;Annotated&quot; to your account. Click <strong>Add Channel</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-bold mb-1">Update your Roku TV</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    Turn on your Roku TV and navigate to <strong>Settings &gt; System &gt; System update &gt; Check now</strong> to download it immediately, or wait a few hours for automatic sync.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Cross-Platform Ecosystem note */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">Looking to create annotations while browsing the web?</p>
              <p className="text-xs text-[hsl(var(--text-muted))]">The official Chrome extension is the primary tool for highlighting and adding notes to any webpage.</p>
            </div>
            <Link
              href="/install"
              className="inline-flex items-center px-4 py-2 rounded text-xs font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--card))] transition-colors flex-shrink-0"
            >
              Get Chrome Extension &rarr;
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
