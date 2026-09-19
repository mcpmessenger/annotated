'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ShieldAlert, CheckCircle2, AlertTriangle, Scale, FileText, Send } from 'lucide-react';

export default function DmcaForm() {
  const searchParams = useSearchParams();
  const initialAnnotationId = searchParams.get('annotation_id') || searchParams.get('id') || '';
  const initialUrl = searchParams.get('url') || '';

  const [claimType, setClaimType] = useState<'takedown' | 'counter_notice'>('takedown');
  const [annotationId, setAnnotationId] = useState(initialAnnotationId);
  const [sourceUrl, setSourceUrl] = useState(initialUrl);

  const [claimantName, setClaimantName] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [claimantPhone, setClaimantPhone] = useState('');
  const [companyOrOwner, setCompanyOrOwner] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [infringingMaterialDescription, setInfringingMaterialDescription] = useState('');
  const [goodFaithAgreement, setGoodFaithAgreement] = useState(false);
  const [accuracyPerjuryAgreement, setAccuracyPerjuryAgreement] = useState(false);
  const [signature, setSignature] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialAnnotationId) setAnnotationId(initialAnnotationId);
    if (initialUrl) setSourceUrl(initialUrl);
  }, [initialAnnotationId, initialUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!goodFaithAgreement || !accuracyPerjuryAgreement) {
      setErrorMsg('You must agree to both legal statements under penalty of perjury.');
      return;
    }

    if (!signature.trim()) {
      setErrorMsg('Electronic signature (full legal name) is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('dmca_claims').insert([
        {
          claim_type: claimType,
          annotation_id: annotationId || null,
          source_url: sourceUrl || null,
          claimant_name: claimantName,
          claimant_email: claimantEmail,
          claimant_phone: claimantPhone || null,
          company_or_owner: companyOrOwner || null,
          work_description: workDescription,
          infringing_material_description: infringingMaterialDescription,
          good_faith_agreement: goodFaithAgreement,
          accuracy_perjury_agreement: accuracyPerjuryAgreement,
          signature: signature,
          status: 'pending'
        }
      ]);

      if (error) {
        console.warn('Database insert failed, initiating email fallback:', error);
        const subject = encodeURIComponent(`[${claimType.toUpperCase()}] DMCA Dispute for ${annotationId || 'Content'}`);
        const body = encodeURIComponent(
          `Claim Type: ${claimType}\n` +
          `Annotation ID: ${annotationId}\n` +
          `Source URL: ${sourceUrl}\n` +
          `Name: ${claimantName}\n` +
          `Email: ${claimantEmail}\n` +
          `Phone: ${claimantPhone}\n` +
          `Organization/Owner: ${companyOrOwner}\n\n` +
          `Original Work:\n${workDescription}\n\n` +
          `Disputed Content / Infringement Explanation:\n${infringingMaterialDescription}\n\n` +
          `Digital Signature: ${signature}\n` +
          `Submitted via web fallback form.`
        );
        window.location.href = `mailto:magnetarsenti@gmail.com?subject=${subject}&body=${body}`;
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      console.error('Error submitting DMCA claim:', err);
      setErrorMsg('An unexpected error occurred. You can also directly email magnetarsenti@gmail.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[hsl(var(--card))] border border-green-500/30 rounded-2xl p-8 text-center shadow-lg my-6">
        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Claim Submitted Successfully</h2>
        <p className="text-sm text-[hsl(var(--text-muted))] max-w-md mx-auto mb-6 leading-relaxed">
          Your {claimType === 'takedown' ? 'DMCA takedown notice' : 'Fair Use counter-notice'} has been received and logged for review. A designated agent will investigate and respond within statutory turnaround guidelines (typically 24–48 hours).
        </p>
        <div className="text-xs text-[hsl(var(--text-subtle))] border-t border-[hsl(var(--border))] pt-4">
          Direct inquiries / Designated Agent: <span className="text-[hsl(var(--foreground))] font-mono">magnetarsenti@gmail.com</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 md:p-8 shadow-sm">
      {/* Tab Switcher */}
      <div className="flex border-b border-[hsl(var(--border))] pb-4 mb-6 gap-3">
        <button
          type="button"
          onClick={() => setClaimType('takedown')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            claimType === 'takedown'
              ? 'bg-red-500/10 text-red-500 border border-red-500/30'
              : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <ShieldAlert size={16} />
          <span>DMCA Takedown Notice</span>
        </button>
        <button
          type="button"
          onClick={() => setClaimType('counter_notice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            claimType === 'counter_notice'
              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
              : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Scale size={16} />
          <span>Fair Use / Counter-Notice</span>
        </button>
      </div>

      <div className="p-3 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start gap-2.5">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>Legal Notice:</strong> Submitting false, fraudulent, or bad-faith copyright claims or counter-notices may expose you to statutory civil liability, damages, and attorney's fees under 17 U.S.C. § 512(f).
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Disputed Resource Identifiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1.5">
              Annotation ID (if applicable)
            </label>
            <input
              type="text"
              value={annotationId}
              onChange={(e) => setAnnotationId(e.target.value)}
              placeholder="e.g. 13c71d60-6890-..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1.5">
              Source URL or Annotated Page
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
            />
          </div>
        </div>

        {/* Claimant Information */}
        <div className="border-t border-[hsl(var(--border))] pt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
            <FileText size={16} className="text-amber-500" />
            Claimant / Representative Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] mb-1.5">
                Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={claimantName}
                onChange={(e) => setClaimantName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={claimantEmail}
                onChange={(e) => setClaimantEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] mb-1.5">
                Telephone Number
              </label>
              <input
                type="tel"
                value={claimantPhone}
                onChange={(e) => setClaimantPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] mb-1.5">
                Copyright Owner / Company (if representing)
              </label>
              <input
                type="text"
                value={companyOrOwner}
                onChange={(e) => setCompanyOrOwner(e.target.value)}
                placeholder="Self, or Media Corp Inc."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
              />
            </div>
          </div>
        </div>

        {/* Work Description & Dispute Details */}
        <div className="border-t border-[hsl(var(--border))] pt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] mb-1.5">
              1. Description of the Original Copyrighted Work <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-[hsl(var(--text-subtle))] mb-2">
              Identify the copyrighted work claimed to have been infringed, or if this is a counter-notice, the original work you are annotating.
            </p>
            <textarea
              required
              rows={3}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Provide a detailed description or link to the original work..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] mb-1.5">
              2. Specific Material to be Removed or Fair Use Justification <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-[hsl(var(--text-subtle))] mb-2">
              Explain why this quote/annotation exceeds Fair Use (criticism, commentary, scholarship under 17 U.S.C. § 107), or why your annotation qualifies as lawful fair use.
            </p>
            <textarea
              required
              rows={4}
              value={infringingMaterialDescription}
              onChange={(e) => setInfringingMaterialDescription(e.target.value)}
              placeholder="Detail the specific quote, commentary, or context..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
            />
          </div>
        </div>

        {/* Declarations & Perjury */}
        <div className="border-t border-[hsl(var(--border))] pt-6 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={goodFaithAgreement}
              onChange={(e) => setGoodFaithAgreement(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))]"
            />
            <span className="text-xs text-[hsl(var(--text-muted))] leading-relaxed">
              I have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law (including the Fair Use doctrine).
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={accuracyPerjuryAgreement}
              onChange={(e) => setAccuracyPerjuryAgreement(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))]"
            />
            <span className="text-xs text-[hsl(var(--text-muted))] leading-relaxed">
              Under penalty of perjury, I declare that the information in this notification is accurate and that I am the copyright owner or authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
            </span>
          </label>
        </div>

        {/* Electronic Signature */}
        <div className="border-t border-[hsl(var(--border))] pt-6">
          <label className="block text-xs font-semibold text-[hsl(var(--text-muted))] mb-1.5">
            Electronic Signature (Type Your Full Legal Name) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="e.g. Jane M. Doe"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm font-medium font-serif italic focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm tracking-wide shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <span>Processing dispute...</span>
          ) : (
            <>
              <Send size={16} />
              <span>Submit Formal Dispute</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
