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
              Annotated is a platform for sharing, discovering, and discussing annotations across the web. We believe reading should be social—that your thoughts matter, and that marginalia deserves a home in the digital age.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Vision</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-3">
              For centuries, scholars and thoughtful readers have written in the margins of books. These annotations—questions, critiques, connections, expansions—represent some of the most valuable thinking humans do. The margins are where dialogue happens.
            </p>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              The digital turn forced margins to disappear. Links replaced margins. Comments were siloed behind paywalls and walled gardens. Annotated reimagines what margins could be on the web: public, interconnected, and rooted in the belief that thoughtful response is a form of literacy.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-4">
              Install the Annotated browser extension. When you encounter text that moves you, highlight it and annotate. Choose your intent:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Highlight:</strong> Mark something important or beautiful.
              </li>
              <li>
                <strong>Question:</strong> Ask what the text means or omits.
              </li>
              <li>
                <strong>Critique:</strong> Disagree or argue.
              </li>
              <li>
                <strong>Expand:</strong> Add context, connections, or elaboration.
              </li>
            </ul>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mt-4">
              Your annotation appears in your public profile and in our explore feed, ready for discussion. The web becomes readable again.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Principles</h2>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Accessibility first:</strong> Annotation is amplified voice. Inaccessible tools silence people.
              </li>
              <li>
                <strong>Privacy by design:</strong> You control your data. Read our{" "}
                <Link href="/privacy" className="text-[hsl(var(--accent))] hover:underline">
                  privacy policy
                </Link>
                .
              </li>
              <li>
                <strong>Thoughtful moderation:</strong> We foster civil discourse while preserving freedom of expression.
              </li>
              <li>
                <strong>Openness:</strong> Annotations are public. The web should be readable by all.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Get Started</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              Ready to start annotating? <Link href="/install" className="text-[hsl(var(--accent))] hover:underline">
                Install the extension
              </Link>{" "}
              or{" "}
              <Link href="/explore" className="text-[hsl(var(--accent))] hover:underline">
                explore existing annotations
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
