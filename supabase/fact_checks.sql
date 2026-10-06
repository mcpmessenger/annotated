-- =============================================================================
-- Annotated - Persistent Fact Checks Table & Policies
-- Ensures fact checks persist across Extension, Website, Mobile, and Roku.
-- Minimizes double-work on the Gemini endpoint by caching verdicts.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dajadbvlldrmgzztdksn/sql/new
-- =============================================================================

create table if not exists public.fact_checks (
  id                  uuid default gen_random_uuid() primary key,
  annotation_id       uuid references public.annotations(id) on delete cascade,
  annotation_slug     text,
  target_url          text,
  claim_text          text,
  verdict             text not null check (verdict in ('VERIFIED', 'FALSE', 'MISLEADING', 'CONTEXT_NEEDED')),
  headline            text not null,
  explanation         text not null,
  confidence          text default 'HIGH',
  timestamp_analysis  text,
  sources             jsonb default '[]'::jsonb,
  rechecked           boolean default false,
  checked_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Deduplication index on annotation_id and annotation_slug
create unique index if not exists fact_checks_ann_id_uniq on public.fact_checks(annotation_id) where annotation_id is not null;
create unique index if not exists fact_checks_ann_slug_uniq on public.fact_checks(annotation_slug) where annotation_slug is not null;
create index if not exists fact_checks_url_idx on public.fact_checks(target_url);
create index if not exists fact_checks_created_idx on public.fact_checks(created_at desc);

-- Enable RLS
alter table public.fact_checks enable row level security;

-- 1. Everyone can read fact checks (publicly cached to prevent duplicate Gemini API calls)
drop policy if exists "Public read fact checks" on public.fact_checks;
create policy "Public read fact checks"
  on public.fact_checks for select
  using (true);

-- 2. Anyone (anon or authenticated) can insert fact checks (populated by API / clients)
drop policy if exists "Anyone can insert fact checks" on public.fact_checks;
create policy "Anyone can insert fact checks"
  on public.fact_checks for insert
  with check (true);

-- 3. Authenticated or service clients can update/recheck existing verdicts
drop policy if exists "Anyone can update fact checks" on public.fact_checks;
create policy "Anyone can update fact checks"
  on public.fact_checks for update
  using (true)
  with check (true);

grant select, insert, update on public.fact_checks to anon, authenticated;
grant all on public.fact_checks to service_role;

-- Storage UPDATE policy on annotation-media bucket so storage upserts also succeed
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Anyone can update annotation media'
  ) then
    create policy "Anyone can update annotation media"
      on storage.objects for update
      using (bucket_id = 'annotation-media')
      with check (bucket_id = 'annotation-media');
  end if;
end $$;
