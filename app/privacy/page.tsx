import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-3xl prose prose-sm max-w-none">
          <h1 className="editorial-heading mb-6">Privacy Policy</h1>

          <p className="text-sm text-[hsl(var(--text-subtle))] mb-8">
            Last updated: September 2026
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              Annotated (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your privacy. This policy explains how we collect, use, disclose, and safeguard your information when you use our website and browser extension.
            </p>
          </section>

          <section className="mb-10 border border-[hsl(var(--border))] rounded-xl p-6 bg-[hsl(var(--card))] shadow-sm">
            <h2 className="text-xl font-bold mb-3 text-[hsl(var(--accent))]">Chrome Web Store & Extension Data (Limited Use)</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-3">
              To comply with Chrome Web Store policies, we explicitly state how the Annotated extension handles your data:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Web History & Page Content:</strong> The extension only reads the URL and content of the specific pages you visit to check if there are public annotations to display, or when you actively highlight text to create a new annotation.
              </li>
              <li>
                <strong>Limited Use:</strong> The information we collect is used <strong>strictly</strong> to provide the core functionality of the Annotated extension (creating, displaying, and managing annotations).
              </li>
              <li>
                <strong>No Tracking or Selling:</strong> We do <strong>not</strong> track your general browsing history. We do <strong>not</strong> sell your data to third parties. We do <strong>not</strong> use or transfer your data for personalized advertising, credit lending, or data brokering.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
            <p className="text-base font-medium text-[hsl(var(--foreground))] mb-3">
              When you use our services, we collect the following categories of information:
            </p>
            <ul className="space-y-3 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Account Information:</strong> Email address, username, display name, and bio (used for your public profile).
              </li>
              <li>
                <strong>Annotation Data:</strong> The text you highlight, your commentary, the source URL of the page you are annotating, your chosen intent, timestamps, and metadata.
              </li>
              <li>
                <strong>Usage & Technical Data:</strong> Browser type, operating system, and basic interaction data to help us identify bugs and improve the extension.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Your Annotations Are Public</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] p-4 bg-[hsl(var(--border))] border-l-4 border-[hsl(var(--accent))] rounded-r-lg">
              Annotated is a multiplayer web experience. By design, <strong>annotations you create are publicly visible</strong>. Your username, display name, the text you highlighted, your commentary, and the URL you annotated are available to anyone on the Annotated website and to anyone with the extension who visits that same URL.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
            <p className="text-base text-[hsl(var(--foreground))] mb-3">We use the information we collect solely to:</p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>Provide, maintain, and improve the Annotated extension</li>
              <li>Enable you to create, share, and discover annotations</li>
              <li>Display your public profile and your public notes to other users</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Enforce our terms of service and prevent abuse</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Data Sharing</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-3">
              We do not sell your personal information. We may share information only in the following circumstances:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Service providers:</strong> Third-party infrastructure providers (like our database hosts) who assist us in operating our website and extension securely.
              </li>
              <li>
                <strong>Legal requirements:</strong> When required by law or to protect our legal rights.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <p className="text-base text-[hsl(var(--foreground))] mb-3">
              Depending on your location, you have the right to:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and completely erase your associated annotations</li>
              <li>Export your data</li>
            </ul>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mt-3">
              To exercise these rights, contact us at <a href="mailto:magnetarsenti@gmail.com" className="text-[hsl(var(--accent))] hover:underline">magnetarsenti@gmail.com</a>.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Data Security</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              We use industry-standard encryption and security measures to protect your information. However, no method of transmission over the Internet is completely secure. Please report any security concerns directly to us.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              If you have questions about this privacy policy or our practices, contact us at:
            </p>
            <p className="text-base text-[hsl(var(--foreground))] mt-3 font-medium">
              Annotated
              <br />
              <a href="mailto:magnetarsenti@gmail.com" className="text-[hsl(var(--accent))] hover:underline">magnetarsenti@gmail.com</a>
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
