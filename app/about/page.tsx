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
