BEGIN;

-- Seed the bootstrap project used to backfill existing records
INSERT INTO public.projects (
    id,
    name,
    description,
    created_by,
    active
) VALUES (
    'PRJ-001',
    'Default Project',
    'Bootstrap project for pre-project LiteBoard records',
    'system',
    TRUE
)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    active = EXCLUDED.active,
    updated_by = 'system',
    updated_at = NOW();

-- Grant every existing workgroup visibility into the default project
INSERT INTO public.project_workgroups (
    project_id,
    workgroup_code,
    created_by
)
SELECT
    'PRJ-001',
    w.ticket_code,
    'system'
FROM public.workgroups w
ON CONFLICT (project_id, workgroup_code) DO NOTHING;

-- Backfill all current tickets into the default project
UPDATE public.tickets
SET project_id = 'PRJ-001'
WHERE project_id IS DISTINCT FROM 'PRJ-001';

-- Backfill all current tags into the default project
UPDATE public.tags
SET project_id = 'PRJ-001'
WHERE project_id IS DISTINCT FROM 'PRJ-001';

-- Validate the staged rollout before later NOT NULL enforcement
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tickets
        WHERE project_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Projects backfill failed: one or more tickets still have NULL project_id.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tags
        WHERE project_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Projects backfill failed: one or more tags still have NULL project_id.';
    END IF;
END;
$$;

COMMIT;
