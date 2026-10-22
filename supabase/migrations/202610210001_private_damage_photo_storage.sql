-- Private storage for ROCAM damage photos. Existing JSON/base64 records are intentionally untouched.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('damage-photos', 'damage-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Active ROCAM users read damage photos" on storage.objects;
create policy "Active ROCAM users read damage photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'damage-photos'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true)
);

drop policy if exists "Active ROCAM users upload damage photos" on storage.objects;
create policy "Active ROCAM users upload damage photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'damage-photos'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true)
);

drop policy if exists "Active ROCAM users update damage photos" on storage.objects;
create policy "Active ROCAM users update damage photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'damage-photos'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true)
)
with check (
  bucket_id = 'damage-photos'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true)
);

drop policy if exists "Active ROCAM users delete damage photos" on storage.objects;
create policy "Active ROCAM users delete damage photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'damage-photos'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true)
);
