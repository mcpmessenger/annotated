-- Annotated Extension — Supabase Schema
-- Run this in your Supabase SQL Editor at https://supabase.com/dashboard

-- ── Annotations table ─────────────────────────────────────────────────────────
create table if not exists public.annotations (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users not null,
  url         text        not null,
  hostname    text,
  page_title  text,
  quote       text        not null,
  comment     text        not null,
  intent      text        not null check (intent in ('Hot Take','Fact Check','Steelmanning','Receipts','Explainer')),
  clip        boolean     default false,
  slug        text        generated always as (
                lower(regexp_replace(
                  left(comment, 60), '[^a-zA-Z0-9]+', '-', 'g'
                )) || '-' || substr(id::text, 1, 8)
              ) stored,
  created_at  timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.annotations enable row level security;

-- Anyone can read all annotations (public feed)
create policy "Public read"
  on public.annotations for select
  using (true);

-- Only authenticated users can insert their own annotations
create policy "Authenticated insert own"
  on public.annotations for insert
  with check (auth.uid() = user_id);

-- Users can update their own annotations
create policy "Update own"
  on public.annotations for update
  using (auth.uid() = user_id);

-- Users can delete their own annotations
create policy "Delete own"
  on public.annotations for delete
  using (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists annotations_url_idx       on public.annotations(url);
create index if not exists annotations_user_id_idx   on public.annotations(user_id);
create index if not exists annotations_created_at_idx on public.annotations(created_at desc);
create index if not exists annotations_hostname_idx  on public.annotations(hostname);
create index if not exists annotations_slug_idx      on public.annotations(slug);
