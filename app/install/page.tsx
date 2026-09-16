import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function InstallPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-3xl">
          <h1 className="editorial-heading mb-6">Install Annotated</h1>

          <div className="space-y-12">
            {/* Browser Extension */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Browser Extension</h2>
              <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-6">
                The Annotated extension lets you highlight and annotate any webpage. Your annotations are instantly shared with our community.
              </p>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="border border-[hsl(var(--border))] rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-3">Chrome & Edge</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))] mb-4">
                    Available on the Chrome Web Store. One click to start annotating.
                  </p>
                  <a
                    href="#"
                    className="inline-flex items-center px-4 py-2 bg-[hsl(var(--foreground))] text-white rounded font-medium hover:shadow-md transition-shadow"
                  >
                    Install on Chrome
                  </a>
                </div>

                <div className="border border-[hsl(var(--border))] rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-3">Firefox</h3>
                  <p className="text-sm text-[hsl(var(--text-muted))] mb-4">
                    Available on Firefox Add-ons. Works the same way as Chrome.
                  </p>
                  <a
                    href="#"
                    className="inline-flex items-center px-4 py-2 bg-[hsl(var(--foreground))] text-white rounded font-medium hover:shadow-md transition-shadow"
                  >
                    Install on Firefox
                  </a>
                </div>
              </div>
            </section>

            {/* Getting Started */}
            <section className="border-t border-[hsl(var(--border))] pt-12">
              <h2 className="text-2xl font-bold mb-4">Getting Started</h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Install the extension</h3>
                    <p className="text-sm text-[hsl(var(--text-muted))]">
                      Click "Install" above for your browser. Grant permissions when prompted.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Create an account</h3>
                    <p className="text-sm text-[hsl(var(--text-muted))]">
                      Sign up with your email. Choose a username for your public profile.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Start annotating</h3>
                    <p className="text-sm text-[hsl(var(--text-muted))]">
                      Highlight any text on the web. The annotation panel opens. Share your thoughts, choose your intent, and publish.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Explore & discuss</h3>
                    <p className="text-sm text-[hsl(var(--text-muted))]">
                      Visit this site to explore annotations from others, find your profile, and join the conversation.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Tips */}
            <section className="border-t border-[hsl(var(--border))] pt-12">
              <h2 className="text-2xl font-bold mb-4">Tips</h2>
              <ul className="space-y-3 text-base text-[hsl(var(--foreground))]">
                <li>
                  <strong>Be specific:</strong> The best annotations quote the exact text they respond to.
                </li>
                <li>
                  <strong>Choose your intent:</strong> Is this a highlight, question, critique, or expansion? The label helps others find what they&apos;re looking for.
                </li>
                <li>
                  <strong>Build in public:</strong> Your annotations are visible immediately. That&apos;s the point.
                </li>
                <li>
                  <strong>Engage respectfully:</strong> Disagreement is welcome. Harassment is not.
                </li>
              </ul>
            </section>

            {/* Support */}
            <section className="border-t border-[hsl(var(--border))] pt-12">
              <h2 className="text-2xl font-bold mb-4">Questions?</h2>
              <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-4">
                Check out our{" "}
                <a href="#" className="text-[hsl(var(--accent))] hover:underline">
                  FAQ
                </a>{" "}
                or{" "}
                <a href="#" className="text-[hsl(var(--accent))] hover:underline">
                  contact us
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
