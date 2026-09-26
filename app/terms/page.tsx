import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <article className="editorial-container py-12 max-w-3xl prose prose-sm max-w-none">
          <h1 className="editorial-heading mb-6">Terms and Conditions</h1>

          <p className="text-sm text-[hsl(var(--text-subtle))] mb-8">
            Last updated: September 2026
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the Annotated platform, including our website (annotated-repo.vercel.app), our browser extension, our Roku Connected TV application, and related services (collectively, the &ldquo;Service&rdquo;). By accessing or using any part of the Service, you agree to be bound by these Terms. If you do not agree, do not access or use the Service.
            </p>
          </section>

          <section className="mb-10 border border-[hsl(var(--border))] rounded-xl p-6 bg-[hsl(var(--card))] shadow-sm">
            <h2 className="text-xl font-bold mb-3 text-[hsl(var(--accent))]">2. Multi-Platform Service Description</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-3">
              Annotated operates across multiple digital touchpoints:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Browser Extension:</strong> Enables users to highlight text, record video clips, and attach commentary or context to third-party web content.
              </li>
              <li>
                <strong>Web Platform:</strong> Provides discovery, sharing, community discussion, and profile management for public annotations.
              </li>
              <li>
                <strong>Roku TV Channel:</strong> Delivers lean-back streaming of community-curated video clips with live synchronized community notes, interactive emotes, and mobile handoff QR passes.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">3. Public Nature of User Content</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] p-4 bg-[hsl(var(--border))] border-l-4 border-[hsl(var(--accent))] rounded-r-lg">
              <strong>Public by Design:</strong> Any annotation, comment, video clip snippet, reaction, or metadata you submit to Annotated is publicly accessible. Do not submit sensitive personal information, proprietary material, or confidential content.
            </p>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mt-4">
              You retain ownership of your original commentary, but you grant Annotated a worldwide, perpetual, royalty-free, non-exclusive license to host, display, syndicate, distribute, and format your submitted content across our web, extension, and TV applications.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">4. Community Notes & AI Fact-Checking Disclaimer</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-3">
              The Service includes automated contextual analysis and fact-checking heuristics powered by Google Gemini AI, as well as community-submitted notes and reactions.
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>
                <strong>Informational Purposes Only:</strong> Fact-check ratings, community badges, and consensus labels are provided for informational and media-literacy purposes only.
              </li>
              <li>
                <strong>No Professional Advice:</strong> Annotations and AI summaries do not constitute legal, medical, financial, or certified professional advice.
              </li>
              <li>
                <strong>Third-Party Accuracy:</strong> Annotated does not endorse, verify the absolute accuracy of, or assume liability for opinions, quotes, or statements made by third parties or community contributors.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">5. Acceptable Use & Conduct</h2>
            <p className="text-base text-[hsl(var(--foreground))] mb-3">
              You agree not to use the Service to:
            </p>
            <ul className="space-y-2 text-base text-[hsl(var(--foreground))]">
              <li>Harass, threaten, defame, or abuse other users or third parties.</li>
              <li>Post content that violates copyright, trademark, privacy, or publicity rights.</li>
              <li>Distribute spam, automated bots, malicious scripts, or deceptive links.</li>
              <li>Interfere with or disrupt the normal operation of our web, mobile, or TV streaming services.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">6. Third-Party Content & DMCA Notice</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              Annotations refer to and quote external websites, articles, and video streams. Annotated is not responsible for external content. If you believe your intellectual property rights have been infringed, please review our <a href="/dmca" className="text-[hsl(var(--accent))] hover:underline">DMCA / Fair Use Policy</a> or contact our designated agent at <a href="mailto:magnetarsenti@gmail.com" className="text-[hsl(var(--accent))] hover:underline">magnetarsenti@gmail.com</a>.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">7. Termination</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              We reserve the right to suspend or terminate your account or access to the Service at our sole discretion, without prior notice, for conduct that violates these Terms or harms other users or the platform.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">8. Disclaimer of Warranties & Limitation of Liability</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, ANNOTATED DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. IN NO EVENT SHALL ANNOTATED BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">9. Contact Information</h2>
            <p className="text-base leading-relaxed text-[hsl(var(--foreground))]">
              Questions regarding these Terms should be directed to:
            </p>
            <p className="text-base text-[hsl(var(--foreground))] mt-3 font-medium">
              Annotated Legal & Support
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
