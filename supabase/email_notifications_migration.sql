-- =====================================================================
-- Annotated: Email Notifications Migration
-- Run this in the Supabase Dashboard → SQL Editor
-- Project: dajadbvlldrmgzztdksn
-- =====================================================================

-- 1. Add email_notifications preference column to profiles
alter table public.profiles
  add column if not exists email_notifications boolean default true;

-- 2. Add email_notifications index
create index if not exists profiles_email_notif_idx
  on public.profiles(email_notifications);

-- 3. Ensure existing users have email_notifications set to true
update public.profiles
  set email_notifications = true
  where email_notifications is null;
