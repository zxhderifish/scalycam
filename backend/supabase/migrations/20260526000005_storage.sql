-- ROLLBACK: delete from storage.buckets where id in ('meals','thumbnails');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('meals',      'meals',      false, 52428800, array['image/jpeg']),
  ('thumbnails', 'thumbnails', false, 10485760, array['image/jpeg'])
on conflict (id) do nothing;

create policy "owner_object_meals_thumbnails" on storage.objects
  for all using (
    bucket_id in ('meals', 'thumbnails')
    and auth.uid()::text = (storage.foldername(name))[1]
  );
