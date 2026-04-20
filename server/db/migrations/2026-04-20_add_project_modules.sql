BEGIN;

-- Create project-to-module assignment mapping
CREATE TABLE IF NOT EXISTS public.project_modules (
    id SERIAL PRIMARY KEY,
    project_id TEXT NOT NULL,
    module_id UUID NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_project_modules_project FOREIGN KEY (project_id)
        REFERENCES public.projects(id),
    CONSTRAINT fk_project_modules_module FOREIGN KEY (module_id)
        REFERENCES public.modules(id),
    CONSTRAINT uq_project_modules UNIQUE (project_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_project_modules_project
    ON public.project_modules(project_id);
CREATE INDEX IF NOT EXISTS idx_project_modules_module
    ON public.project_modules(module_id);

-- Enforce strict bootstrap strategy for existing data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.projects
        WHERE id = 'PRJ-001'
    ) THEN
        RAISE EXCEPTION 'project_modules seed failed: PRJ-001 (Default Project) was not found.';
    END IF;
END;
$$;

-- Seed all current modules into PRJ-001 only
INSERT INTO public.project_modules (
    project_id,
    module_id,
    created_by
)
SELECT
    'PRJ-001',
    m.id,
    'system'
FROM public.modules m
WHERE m.deleted_at IS NULL
ON CONFLICT (project_id, module_id) DO NOTHING;

COMMIT;
