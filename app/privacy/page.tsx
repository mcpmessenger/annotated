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

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
            <p className="text-base font-medium text-[hsl(var(--foreground))] mb-3">
              We collect the following categories of information:
            </p>
            <ul className="space-y-3 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Account Information:</strong> Email address, username, display name, and bio.
              </li>
              <li>
                <strong>Annotation Data:</strong> The text you highlight, your commentary, the source URL, your chosen intent, timestamps, and metadata.
              </li>
              <li>
                <strong>Usage Data:</strong> How you interact with the extension and website (clicks, navigation, time spent).
              </li>
              <li>
                <strong>Technical Data:</strong> Browser type, IP address, device type, and operating system.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
            <p className="text-base text-[hsl(var(--foreground))] mb-3">We use the information we collect to:</p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>Provide and improve the Annotated service</li>
              <li>Enable annotation creation, sharing, and discovery</li>
              <li>Display your public profile and shared annotations</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Enforce our terms of service and prevent abuse</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Your Annotations Are Public</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              By default, annotations you create are publicly visible. Your username, display name, annotation text, and the sources you annotate are available to anyone on the Annotated website and through the explore feed. You can manage the visibility of your annotations in your account settings.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Data Sharing</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-3">
              We do not sell your personal information. We may share information in the following circumstances:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Service providers:</strong> Third parties who assist us in operating our website and extension.
              </li>
              <li>
                <strong>Legal requirements:</strong> When required by law or to protect our legal rights.
              </li>
              <li>
                <strong>Business transfers:</strong> In the event of merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <p className="text-base text-[hsl(var(--foreground))] mb-3">
              Depending on your location, you may have the right to:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated annotations</li>
              <li>Export your data</li>
              <li>Opt out of non-essential processing</li>
            </ul>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mt-3">
              To exercise these rights, contact us at magnetarsenti@gmail.com.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Data Security</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              We use industry-standard encryption and security measures to protect your information. However, no method is completely secure. Please report any security concerns to magnetarsenti@gmail.com.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              If you have questions about this privacy policy or our practices, contact us at:
            </p>
            <p className="text-base text-[hsl(var(--foreground))] mt-3">
              Annotated
              <br />
              magnetarsenti@gmail.com
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
