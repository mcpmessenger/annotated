import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, Tv, Globe, HelpCircle, MessageSquare, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--background))]">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-3xl">
          <h1 className="editorial-heading mb-4">Annotated Support Center</h1>
          <p className="text-base text-[hsl(var(--text-muted))] mb-8 leading-relaxed">
            Welcome to the Annotated Help & Support portal. Find guidance for using Annotated on Roku TV, the Chrome browser extension, and our web community platform.
          </p>

          {/* Quick Contact Card */}
          <div className="mb-10 p-6 rounded-2xl border border-sky-500/30 bg-sky-950/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-1">
                Direct Support & Inquiries
              </span>
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Need help with an account or channel?</h2>
              <p className="text-sm text-[hsl(var(--text-muted))] mt-1">
                Our support team is available via email for technical questions, bug reports, and feedback.
              </p>
            </div>
            <a
              href="mailto:magnetarsenti@gmail.com?subject=Annotated%20Support%20Request"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Support</span>
            </a>
          </div>

          {/* Roku TV Support Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[hsl(var(--foreground))]">
              <Tv className="w-6 h-6 text-sky-400" />
              Roku TV Channel Guide & FAQ
            </h2>

            <div className="space-y-4 text-base">
              <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <h3 className="font-bold text-base mb-1 text-[hsl(var(--foreground))]">
                  How do I browse Community Notes on my Roku remote?
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                  Press <strong>[Right]</strong> or <strong>[*] (Options)</strong> on your Roku remote to toggle active rail browsing. Use <strong>[Up]</strong> and <strong>[Down]</strong> to scroll through notes, and press <strong>[OK]</strong> to open the full inspection modal.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <h3 className="font-bold text-base mb-1 text-[hsl(var(--foreground))]">
                  How does the Mobile Pass QR Code work?
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                  When viewing an annotation on TV, scan the on-screen QR code with your smartphone camera. You will be directed to our mobile pass view (<code>/n/[slug]</code>) where you can read the unabridged source quote, tap <strong>&ldquo;Open Original Source ↗&rdquo;</strong> to view the primary document, or jump into the web discussion.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <h3 className="font-bold text-base mb-1 text-[hsl(var(--foreground))]">
                  How do I react to videos on TV?
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                  In passive playback mode, navigate along the bottom reaction pills (🔥 Fire, 🤔 Thinking, 💡 Insight, 💯 Verified, 👎 Scrutiny) and press <strong>[OK]</strong> to send your emote in real-time.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <h3 className="font-bold text-base mb-1 text-[hsl(var(--foreground))]">
                  What do the fact-check badges mean?
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                  Annotated uses automated contextual analysis powered by Google Gemini AI along with primary source checks. Notes labeled <strong>&ldquo;Verified Accurate&rdquo;</strong> have multi-source primary documentation confirmed, while others highlight omissions or disputed claims.
                </p>
              </div>
            </div>
          </section>

          {/* Browser Extension Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[hsl(var(--foreground))]">
              <Globe className="w-6 h-6 text-amber-400" />
              Browser Extension Support
            </h2>

            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
              <p className="text-sm leading-relaxed text-[hsl(var(--text-muted))]">
                The Annotated Chrome Extension allows you to highlight text, clip videos, and drop community notes on any webpage.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="https://chromewebstore.google.com/detail/annotated/bnaejhcknifnikgiohecinndejbajfdo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:underline"
                >
                  <span>Install from Chrome Web Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="text-[hsl(var(--border))]">•</span>
                <Link href="/about" className="text-xs font-bold text-[hsl(var(--foreground))] hover:underline">
                  About the Platform
                </Link>
              </div>
            </div>
          </section>

          {/* Issue Reporting & Legal */}
          <section className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--border))]/20">
            <h3 className="font-bold text-base mb-2 text-[hsl(var(--foreground))] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Additional Resources
            </h3>
            <ul className="space-y-2 text-sm text-[hsl(var(--text-muted))]">
              <li>
                • Review our <Link href="/terms" className="text-sky-400 hover:underline">Terms and Conditions</Link> and <Link href="/privacy" className="text-sky-400 hover:underline">Privacy Policy</Link>.
              </li>
              <li>
                • To report copyright infringement or content disputes, visit our <Link href="/dmca" className="text-sky-400 hover:underline">DMCA / Fair Use Policy</Link>.
              </li>
              <li>
                • For developer inquiries or open-source issue reports, visit our <a href="https://github.com/mcpmessenger/annotated/issues" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GitHub Repository</a>.
              </li>
            </ul>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
