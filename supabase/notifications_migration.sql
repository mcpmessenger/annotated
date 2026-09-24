-- =====================================================================
-- Annotated: Notifications Table Migration
-- Run this in the Supabase Dashboard → SQL Editor
-- Project: dajadbvlldrmgzztdksn
-- =====================================================================

-- 1. Create the notifications table
create table if not exists public.notifications (
  id            uuid        default gen_random_uuid() primary key,
  recipient_id  uuid        not null,
  sender_id     uuid,
  annotation_id uuid        references public.annotations(id) on delete cascade,
  comment_id    uuid        references public.comments(id) on delete cascade,
  message       text        not null,
  read          boolean     default false,
  created_at    timestamptz default now()
);

-- 2. Enable RLS
alter table public.notifications enable row level security;

-- 3. Policies
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

drop policy if exists "Authenticated users can insert notifications" on public.notifications;
create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = recipient_id);

-- 4. Performance index
create index if not exists notif_recipient_read_idx
  on public.notifications(recipient_id, read, created_at desc);
