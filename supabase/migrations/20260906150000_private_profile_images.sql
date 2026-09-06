update storage.buckets
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/webp']
where id = 'profile-images';

drop policy if exists "Profile images are public" on storage.objects;
drop policy if exists "Users upload profile images to own folder" on storage.objects;
drop policy if exists "Users update own profile images" on storage.objects;
drop policy if exists "Users delete own profile images" on storage.objects;
