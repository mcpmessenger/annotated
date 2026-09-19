-- Create DMCA / Fair Use disputes table
CREATE TABLE IF NOT EXISTS public.dmca_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_type TEXT NOT NULL DEFAULT 'takedown', -- 'takedown' or 'counter_notice'
    annotation_id TEXT,
    source_url TEXT,
    claimant_name TEXT NOT NULL,
    claimant_email TEXT NOT NULL,
    claimant_phone TEXT,
    company_or_owner TEXT,
    work_description TEXT NOT NULL,
    infringing_material_description TEXT NOT NULL,
    good_faith_agreement BOOLEAN NOT NULL DEFAULT false,
    accuracy_perjury_agreement BOOLEAN NOT NULL DEFAULT false,
    signature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewing', 'resolved', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dmca_claims ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a claim (public takedown/dispute form)
CREATE POLICY "Anyone can submit a dmca claim"
ON public.dmca_claims FOR INSERT WITH CHECK (true);

-- Only authenticated staff/service role can view/update claims
CREATE POLICY "Service role can view claims"
ON public.dmca_claims FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role can update claims"
ON public.dmca_claims FOR UPDATE USING (auth.role() = 'service_role');

GRANT INSERT ON TABLE public.dmca_claims TO anon, authenticated;
GRANT ALL ON TABLE public.dmca_claims TO service_role;

NOTIFY pgrst, 'reload schema';
