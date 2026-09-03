-- Corporate PDFs must never bypass organization-link publication timing via a
-- predictable public storage URL. Application routes now mint signed URLs only
-- after their authorization and publish-time checks pass.
update storage.buckets
set public = false
where id = 'organization-assets';

drop policy if exists "Organization assets are public" on storage.objects;
