import { Suspense } from "react";
import DmcaForm from "./DmcaForm";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "DMCA & Fair Use Dispute Policy | Annotated",
  description: "Submit a DMCA takedown notice or dispute fair use for content hosted on Annotated.",
};

export default function DmcaPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Header />
      <main className="flex-1 py-10 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
              Legal & Compliance
            </span>
            <h1 className="text-3xl md:text-4xl font-black mt-3 mb-3 tracking-tight">
              DMCA Notice & Fair Use Dispute
            </h1>
            <p className="text-sm md:text-base text-[hsl(var(--text-muted))] leading-relaxed">
              Annotated respects the intellectual property rights of others and expects our users to do the same. In accordance with the Digital Millennium Copyright Act (17 U.S.C. § 512) and applicable copyright laws, please use this form to submit formal copyright claims or Fair Use disputes.
            </p>
          </div>

          <Suspense fallback={<div className="p-8 text-center text-sm text-[hsl(var(--text-muted))]">Loading dispute form...</div>}>
            <DmcaForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
