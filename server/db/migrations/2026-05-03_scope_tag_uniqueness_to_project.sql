BEGIN;

-- Tags are project-scoped: the same label may exist in different projects,
-- but active tags within one project must remain unique case-insensitively.
ALTER TABLE public.tags
    DROP CONSTRAINT IF EXISTS uq_tags_label_active;

DROP INDEX IF EXISTS public.uq_tags_label_active;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_project_label_active
    ON public.tags (COALESCE(project_id, ''), lower(label))
    WHERE deleted_at IS NULL;

COMMIT;
