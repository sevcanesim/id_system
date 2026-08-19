-- Roadmap Faz 0: activate the legal document versions deployed with the 2026-08-13 release.
update public.legal_documents
set version = '2026-08-13',
    effective_at = '2026-08-13',
    is_active = true,
    updated_at = now()
where code in ('DISTANCE_SALES', 'PERSONALIZATION', 'PRIVACY');
