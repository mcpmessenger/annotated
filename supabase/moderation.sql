-- =============================================================================
-- Annotated - Content Moderation (Amazon Appstore / Google Play UGC policy)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- =============================================================================

-- 1. Moderation status on annotations
alter table public.annotations add column if not exists moderation_status text not null default 'approved';
alter table public.annotations add column if not exists moderation_reason text;

do $$
begin
  if to_regclass('public.comments') is not null then
    alter table public.comments add column if not exists moderation_status text not null default 'approved';
    alter table public.comments add column if not exists moderation_reason text;
  end if;
end $$;

-- 2. Banned users table
create table if not exists public.banned_users (
  user_id   uuid primary key,
  reason    text,
  banned_at timestamptz default now()
);
alter table public.banned_users enable row level security;
drop policy if exists "Banned list readable" on public.banned_users;
create policy "Banned list readable" on public.banned_users for select using (true);
grant select on public.banned_users to anon, authenticated;
grant all on public.banned_users to service_role;

-- 3. User reports table
create table if not exists public.content_reports (
  id               uuid primary key default gen_random_uuid(),
  content_type     text not null check (content_type in ('annotation','comment','user')),
  content_id       text not null,
  reported_user_id uuid,
  reporter_id      uuid,
  reporter_client  text,
  reporter_ip      text,
  reason           text not null,
  details          text,
  status           text not null default 'pending',
  created_at       timestamptz default now(),
  resolved_at      timestamptz
);
create index if not exists content_reports_content_idx on public.content_reports(content_type, content_id);
create index if not exists content_reports_status_idx  on public.content_reports(status, created_at desc);
alter table public.content_reports enable row level security;
drop policy if exists "Anyone can file a report" on public.content_reports;
create policy "Anyone can file a report" on public.content_reports for insert with check (true);
drop policy if exists "Service role reads reports" on public.content_reports;
create policy "Service role reads reports" on public.content_reports for select using (auth.role() = 'service_role');
grant insert on public.content_reports to anon, authenticated;
grant all on public.content_reports to service_role;

-- 4. Per-user block list
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists "Own blocks select" on public.user_blocks;
drop policy if exists "Own blocks insert" on public.user_blocks;
drop policy if exists "Own blocks delete" on public.user_blocks;
create policy "Own blocks select" on public.user_blocks for select using (auth.uid() = blocker_id);
create policy "Own blocks insert" on public.user_blocks for insert with check (auth.uid() = blocker_id);
create policy "Own blocks delete" on public.user_blocks for delete using (auth.uid() = blocker_id);
grant select, insert, delete on public.user_blocks to authenticated;

-- 5. Restrictive visibility policies
drop policy if exists "Hide moderated annotations" on public.annotations;
create policy "Hide moderated annotations" on public.annotations
  as restrictive for select
  using (
    (
      moderation_status = 'approved'
      and not exists (select 1 from public.banned_users b where b.user_id = annotations.user_id)
    )
    or auth.uid() = user_id
  );

drop policy if exists "Banned users cannot post annotations" on public.annotations;
create policy "Banned users cannot post annotations" on public.annotations
  as restrictive for insert
  with check (not exists (select 1 from public.banned_users b where b.user_id = auth.uid()));

do $$
begin
  if to_regclass('public.comments') is not null then
    execute 'drop policy if exists "Hide moderated comments" on public.comments';
    execute $p$create policy "Hide moderated comments" on public.comments
      as restrictive for select
      using (
        (
          moderation_status = 'approved'
          and not exists (select 1 from public.banned_users b where b.user_id = comments.user_id)
        )
        or auth.uid() = user_id
      )$p$;
    execute 'drop policy if exists "Banned users cannot post comments" on public.comments';
    execute $p$create policy "Banned users cannot post comments" on public.comments
      as restrictive for insert
      with check (not exists (select 1 from public.banned_users b where b.user_id = auth.uid()))$p$;
  end if;
end $$;

notify pgrst, 'reload schema';
