BEGIN;

-- Keep audit trigger compatible after dropping tickets.status
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log priority changes
    IF (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
        INSERT INTO status_history (
            ticket_id, activity_type, field_name, old_value, new_value, changed_by
        ) VALUES (
            NEW.id, 'field_change', 'priority', OLD.priority, NEW.priority,
            COALESCE(NEW.responsible_employee_id, NEW.created_by)
        );
    END IF;

    -- Log assignment changes
    IF (TG_OP = 'UPDATE' AND OLD.responsible_employee_id IS DISTINCT FROM NEW.responsible_employee_id) THEN
        INSERT INTO status_history (
            ticket_id, activity_type, field_name, old_value, new_value, changed_by
        ) VALUES (
            NEW.id, 'assigned', 'responsible_employee_id',
            OLD.responsible_employee_id::TEXT, NEW.responsible_employee_id::TEXT,
            COALESCE(NEW.responsible_employee_id, NEW.created_by)
        );
    END IF;

    -- Log workflow step transitions
    IF (TG_OP = 'UPDATE' AND OLD.step_code IS DISTINCT FROM NEW.step_code) THEN
        INSERT INTO status_history (
            ticket_id, activity_type, field_name, old_value, new_value, changed_by
        ) VALUES (
            NEW.id, 'transition', 'step_code', OLD.step_code, NEW.step_code,
            COALESCE(NEW.responsible_employee_id, NEW.created_by)
        );
    END IF;

    -- Log creation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO status_history (
            ticket_id, activity_type, field_name, old_value, new_value, changed_by
        ) VALUES (
            NEW.id, 'created', 'step_code', NULL, NEW.step_code,
            COALESCE(NEW.created_by, NEW.responsible_employee_id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Views referencing tickets.status must be dropped before column removal
DROP VIEW IF EXISTS public.v_employee_workload;
DROP VIEW IF EXISTS public.v_active_tickets;

-- Legacy status-only objects
DROP INDEX IF EXISTS public.idx_tickets_status;
DROP INDEX IF EXISTS public.idx_tickets_workgroup_status;
DROP INDEX IF EXISTS public.idx_tickets_responsible_status;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS chk_tickets_status;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS status;

-- Replacement step-based indexes
CREATE INDEX IF NOT EXISTS idx_tickets_step_code
    ON public.tickets(step_code)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_workgroup_step_code
    ON public.tickets(workgroup_id, step_code)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_responsible_step_code
    ON public.tickets(responsible_employee_id, step_code)
    WHERE deleted_at IS NULL;

-- Recreate views without tickets.status dependency
CREATE VIEW public.v_active_tickets AS
SELECT
    t.id,
    t.ticket_code,
    t.title,
    t.description,
    COALESCE(ws.step_name, t.step_code) AS current_step_name,
    ws.category_code AS step_category_code,
    t.priority,
    t.due_date,
    t.created_at,
    w.name AS workflow_name,
    ws.step_name AS current_step,
    wg.name AS workgroup_name,
    e.name AS responsible_employee_name,
    e.email AS responsible_employee_email,
    m.name AS module_name,
    creator.name AS created_by_name
FROM public.tickets t
LEFT JOIN public.workflows w ON t.workflow_id = w.id
LEFT JOIN public.workflow_steps ws ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
LEFT JOIN public.workgroups wg ON t.workgroup_id = wg.id
LEFT JOIN public.employees e ON t.responsible_employee_id = e.id
LEFT JOIN public.employees creator ON t.created_by = creator.id
LEFT JOIN public.modules m ON t.module_id = m.id
WHERE t.deleted_at IS NULL;

CREATE VIEW public.v_employee_workload AS
SELECT
    e.id,
    e.name,
    e.email,
    wg.name AS workgroup_name,
    COUNT(t.id) FILTER (WHERE ws.category_code = 10) AS open_tickets,
    COUNT(t.id) FILTER (WHERE ws.category_code = 20) AS in_progress_tickets,
    COUNT(t.id) FILTER (WHERE ws.category_code IN (10, 20)) AS active_tickets,
    COUNT(t.id) AS total_assigned_tickets
FROM public.employees e
LEFT JOIN public.workgroups wg ON e.workgroup_id = wg.id
LEFT JOIN public.tickets t ON e.id = t.responsible_employee_id AND t.deleted_at IS NULL
LEFT JOIN public.workflow_steps ws ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
WHERE e.deleted_at IS NULL AND e.active = true
GROUP BY e.id, e.name, e.email, wg.name;

COMMIT;
