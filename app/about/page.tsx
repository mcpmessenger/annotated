import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-3xl prose prose-sm max-w-none">
          <h1 className="editorial-heading mb-6">About Annotated</h1>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">What is Annotated?</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              Annotated is the public annotation layer for the internet. It turns the static web into a shared, multiplayer experience. We believe reading shouldn't be a solitary act—that your insights, questions, and critiques deserve a permanent home exactly where they are most relevant: right on the page.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Multiplayer Web</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-3">
              For centuries, the best part of reading was often found in the margins—notes passed down by previous readers. But as content moved online, margins disappeared. Our commentary was stripped from the source material and siloed away in isolated social media feeds or paywalled comment sections.
            </p>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              Annotated brings the margins back. When you leave an annotation, it doesn't just go to a separate feed—it stays on the web page. <strong>Anyone else with the extension who visits that exact same page will instantly see your yellow highlights.</strong> They can hover over your highlights to read your thoughts, and reply directly in the browser to start a global conversation right on the source text.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-4">
              Install the Annotated browser extension. When you encounter a thought-provoking article, a wild claim on X (Twitter), or a specific timestamp in a YouTube video, simply highlight the text, right-click, and drop your thoughts. You can also assign an intent to your note:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Highlight:</strong> Mark something important or beautiful.
              </li>
              <li>
                <strong>Question:</strong> Ask what the text means or what it omits.
              </li>
              <li>
                <strong>Critique:</strong> Disagree, fact-check, or argue.
              </li>
              <li>
                <strong>Expand:</strong> Add valuable context, connections, or elaboration.
              </li>
            </ul>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mt-4">
              Your note instantly becomes part of the public web. Every annotation is permanently tied to its source URL, creating a durable network of shared knowledge.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Multi-Platform Ecosystem</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-4">
              Knowledge doesn&apos;t live on a single screen. Annotated is designed as a unified, cross-device ecosystem where commentary flows seamlessly between creation, exploration, and lean-back consumption:
            </p>
            
            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 my-6 not-prose">
              <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
                <div className="text-2xl mb-2">💻</div>
                <h3 className="font-bold text-base mb-1">Browser Extension</h3>
                <span className="text-xs font-semibold text-[hsl(var(--accent))] uppercase tracking-wider block mb-2">The Creation Engine</span>
                <p className="text-sm text-[hsl(var(--text-muted))]">
                  Highlight text, timestamp videos, and publish contextual margins directly on any webpage as you browse.
                </p>
              </div>

              <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
                <div className="text-2xl mb-2">🌐</div>
                <h3 className="font-bold text-base mb-1">Web Platform</h3>
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block mb-2">The Community Hub</span>
                <p className="text-sm text-[hsl(var(--text-muted))]">
                  Search annotations, explore trending discussions, follow trusted curators, and manage your public profile.
                </p>
              </div>

              <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
                <div className="text-2xl mb-2">📺</div>
                <h3 className="font-bold text-base mb-1">Roku TV Channel</h3>
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block mb-2">The Living Room</span>
                <p className="text-sm text-[hsl(var(--text-muted))]">
                  Experience video annotations and community fact-checking on the big screen with your TV remote.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mt-4 not-prose">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[hsl(var(--foreground))]">Why TV? Fact-Checking on the Big Screen</h4>
                  <p className="text-xs text-[hsl(var(--text-muted))] mt-1 max-w-xl">
                    Long-form video essays, news reports, and documentaries are best watched on television. Our official Roku channel brings community consensus badges (Verified, Disputed, Unverified), timestamped commentary, and remote reactions directly to your living room.
                  </p>
                </div>
                <Link
                  href="/roku"
                  className="inline-flex items-center px-4 py-2 rounded text-xs font-semibold bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity flex-shrink-0"
                >
                  Explore Roku Channel &rarr;
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Our Principles</h2>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Break Down Walled Gardens:</strong> Commentary belongs with the content, not locked inside isolated social platforms.
              </li>
              <li>
                <strong>Public by Default:</strong> Annotations are meant to be seen. The internet should be readable, debatable, and transparent for everyone.
              </li>
              <li>
                <strong>Privacy by Design:</strong> You own your thoughts and control your data. Read our{" "}
                <Link href="/privacy" className="text-[hsl(var(--accent))] hover:underline">
                  privacy policy
                </Link>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Join the Network</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              Ready to leave your mark on the internet? <Link href="/install" className="text-[hsl(var(--accent))] hover:underline font-bold">
                Install the extension
              </Link>{" "}
              or{" "}
              <Link href="/explore" className="text-[hsl(var(--accent))] hover:underline">
                explore the live feed
              </Link>
              .
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
