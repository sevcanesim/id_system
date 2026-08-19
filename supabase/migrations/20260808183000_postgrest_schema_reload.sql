-- v24.7: Ask Supabase PostgREST to refresh its schema cache after analytics
-- migrations. Safe to run repeatedly.
NOTIFY pgrst, 'reload schema';
