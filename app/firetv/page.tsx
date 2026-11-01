import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tv, QrCode, Zap } from "lucide-react";

export const metadata = {
  title: "Annotated for Fire TV - The Living Room Annotation Layer",
  description:
    "Floating annotation bubbles, live fact-checks, and a QR-to-phone dispute flow — the community annotation layer, built for your Fire TV.",
};

const APPSTORE_URL = "https://www.amazon.com/gp/product/B0HLMXSN93";
const DEMO_VIDEO_ID = "4vB4qotGvbs";
const SOURCE_URL = "https://github.com/mcpmessenger/annotated-firetv";

export default function FireTvPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-4xl">
          {/* Badge & Title */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live on the Amazon Appstore
            </span>
          </div>

          <h1 className="editorial-heading mb-4">Annotated for Fire TV</h1>
          <p className="editorial-subheading max-w-2xl mb-8">
            The community annotation layer, built for the living room. Floating
            annotation bubbles, live fact-checks, and a QR-to-phone dispute
            flow — all from your couch.
          </p>

          {/* Primary Action Hero Card */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8 mb-12 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-xl font-bold">Get it on Fire TV</h2>
                <p className="text-sm text-[hsl(var(--text-muted))] max-w-md">
                  Free on the Amazon Appstore. Install it straight from your
                  Fire TV, or send it to your device from your phone.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <a
                  href={APPSTORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity text-sm text-center shadow"
                >
                  Amazon Appstore &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* Demo Video */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Watch it in action</h2>
            <div className="rounded-xl overflow-hidden border border-[hsl(var(--border))] shadow-xl bg-black">
              <div className="aspect-video relative">
                <iframe
                  src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?autoplay=0&rel=0`}
                  title="Annotated for Fire TV Demo"
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>

          {/* Key Capabilities */}
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <Tv className="w-4 h-4" />
              </div>
              <h3 className="font-bold mb-2">Floating Annotation Bubbles</h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Annotations drift across the screen as floating bubbles, synced
                to what you&apos;re watching.
              </p>
            </div>

            <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-bold mb-2">Live Fact-Checks</h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Community consensus banners — Verified, Disputed, or Caution —
                appear in real time on the big screen.
              </p>
            </div>

            <div className="border border-[hsl(var(--border))] rounded-lg p-5 bg-[hsl(var(--card))]">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
                <QrCode className="w-4 h-4" />
              </div>
              <h3 className="font-bold mb-2">QR-to-Phone Disputes</h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Disagree with a fact-check? Scan the on-screen QR code to open
                the dispute on your phone and join the thread.
              </p>
            </div>
          </div>

          {/* Step by Step Install Guide */}
          <section className="border-t border-[hsl(var(--border))] pt-10 mb-12">
            <h2 className="text-xl font-bold mb-6">How to Install on Your Fire TV</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold mb-1">Open the Amazon Appstore on your Fire TV</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    Search for &quot;Annotated&quot; and select{" "}
                    <strong>Install</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold mb-1">Or send it from your phone</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    Open{" "}
                    <a
                      href={APPSTORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--foreground))] underline font-medium"
                    >
                      the Appstore listing
                    </a>{" "}
                    on your phone or desktop while signed into the same Amazon
                    account — the app will appear on your Fire TV.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-bold mb-1">Open the app</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))]">
                    Your annotations sync with the same account you use in the{" "}
                    <Link
                      href="/install"
                      className="text-[hsl(var(--foreground))] underline font-medium"
                    >
                      Chrome extension
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Open Source */}
          <section className="border-t border-[hsl(var(--border))] pt-10">
            <h2 className="text-xl font-bold mb-4">Built in the open</h2>
            <p className="text-sm text-[hsl(var(--text-muted))] mb-4 max-w-2xl">
              The Fire TV app is open source — native Kotlin with a WebView,
              released under the MIT license.
            </p>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 rounded-[6px] font-medium border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors text-sm"
            >
              View source on GitHub &rarr;
            </a>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
