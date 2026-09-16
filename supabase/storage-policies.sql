-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/dajadbvlldrmgzztdksn/sql/new

-- Storage RLS policies for annotation-media bucket
create policy "Authenticated users can upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'annotation-media');

create policy "Public can read annotation media"
  on storage.objects for select
  using (bucket_id = 'annotation-media');

create policy "Users can delete their own media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'annotation-media' and owner = auth.uid()::text);
