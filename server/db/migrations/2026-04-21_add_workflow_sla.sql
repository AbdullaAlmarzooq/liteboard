BEGIN;

ALTER TABLE public.workflows
    ADD COLUMN IF NOT EXISTS sla_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.workflow_steps
    ADD COLUMN IF NOT EXISTS sla_days INTEGER;

ALTER TABLE public.workflow_steps
    DROP CONSTRAINT IF EXISTS chk_workflow_steps_sla_days_range;
ALTER TABLE public.workflow_steps
    ADD CONSTRAINT chk_workflow_steps_sla_days_range
    CHECK (sla_days IS NULL OR (sla_days BETWEEN 1 AND 99));

ALTER TABLE public.workflow_steps
    DROP CONSTRAINT IF EXISTS chk_workflow_steps_terminal_sla_empty;
ALTER TABLE public.workflow_steps
    ADD CONSTRAINT chk_workflow_steps_terminal_sla_empty
    CHECK (
        (category_code IN (30, 40) AND sla_days IS NULL)
        OR category_code NOT IN (30, 40)
    );

COMMENT ON COLUMN public.workflows.sla_enabled IS
    'When true, ticket due_date is system-calculated from workflow step SLA days';
COMMENT ON COLUMN public.workflow_steps.sla_days IS
    'Planned SLA days for non-terminal steps; null when workflow SLA is disabled or step is terminal';

COMMIT;
