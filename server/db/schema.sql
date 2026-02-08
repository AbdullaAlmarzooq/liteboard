-- =====================================================================
-- LiteBoard PostgreSQL Schema for Neon
-- Production-ready ticket management system
-- =====================================================================
-- Version: 1.0.0
-- Database: PostgreSQL 15+ (Neon compatible)
-- Features: UUID PKs, soft deletion, auditing, partial indexes
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For fuzzy text search

-- =====================================================================
-- 1. ROLES TABLE
-- =====================================================================
-- Defines user permission levels (Admin, Editor, Viewer)
-- Hard-coded IDs for application logic
CREATE TABLE roles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data for roles (required for application logic)
INSERT INTO roles (id, name, description) VALUES
    (1, 'Admin', 'Full system access including workflow management'),
    (2, 'Editor', 'Can create and edit tickets within their workgroup'),
    (3, 'Viewer', 'Read-only access to tickets within their workgroup');

-- =====================================================================
-- 2. WORKGROUPS TABLE
-- =====================================================================
-- Organizational units for access control and ticket isolation
CREATE TABLE workgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL    ,  -- Unique code prefix for ticket IDs (e.g., 'TCK-1024')
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Soft delete support: allow same name if previous deleted
    CONSTRAINT uq_workgroups_name_active UNIQUE NULLS NOT DISTINCT (name, deleted_at)
);

-- =====================================================================
-- 3. EMPLOYEES TABLE
-- =====================================================================
-- User accounts with authentication and workgroup assignment
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt hash
    position TEXT,
    department TEXT,
    role_id INTEGER NOT NULL DEFAULT 3,  -- Default to Viewer
    workgroup_id UUID,
    active BOOLEAN NOT NULL DEFAULT true,
    joined_date DATE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT fk_employees_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_employees_workgroup FOREIGN KEY (workgroup_id) 
        REFERENCES workgroups(id) ON DELETE SET NULL,
    
    -- Email must be unique among active users only
    CONSTRAINT uq_employees_email_active UNIQUE NULLS NOT DISTINCT (email, deleted_at),
    
    CONSTRAINT chk_employees_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================================
-- 4. WORKFLOWS TABLE
-- =====================================================================
-- Defines multi-step approval processes
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT uq_workflows_name_active UNIQUE NULLS NOT DISTINCT (name, deleted_at)
);

-- =====================================================================
-- 6. WORKFLOW STEPS TABLE
-- =====================================================================
-- Individual steps within a workflow
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    step_code TEXT NOT NULL,  -- Unique identifier used in transitions
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    category_code INTEGER NOT NULL,  -- 10=normal, 90=cancelled/rejected
    workgroup_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT fk_workflow_steps_workflow FOREIGN KEY (workflow_id) 
        REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_steps_workgroup FOREIGN KEY (workgroup_id) 
        REFERENCES workgroups(id) ON DELETE SET NULL,
    
    -- step_code must be unique per workflow (soft-delete aware)
    CONSTRAINT uq_workflow_steps_workflow_code UNIQUE (workflow_id, step_code, deleted_at),

    -- Enforce unique ordering within workflow
    CONSTRAINT uq_workflow_steps_order UNIQUE (workflow_id, step_order, deleted_at),

    CONSTRAINT chk_workflow_steps_order CHECK (step_order > 0),
    CONSTRAINT chk_workflow_steps_category CHECK (category_code IN (10, 90)),

    CONSTRAINT uq_workflow_steps_workflow_step UNIQUE (workflow_id, step_code)
);

-- =====================================================================
-- 7. WORKFLOW TRANSITIONS TABLE
-- =====================================================================
-- Defines valid state transitions between workflow steps
-- This table was missing from SQLite schema but referenced in README
CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    from_step_code TEXT NOT NULL,
    to_step_code TEXT NOT NULL,
    transition_name TEXT,
    requires_comment BOOLEAN NOT NULL DEFAULT false,
    cancel_allowed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT fk_workflow_transitions_workflow FOREIGN KEY (workflow_id)
        REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_transitions_from FOREIGN KEY (workflow_id, from_step_code)
        REFERENCES workflow_steps(workflow_id, step_code) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_transitions_to FOREIGN KEY (workflow_id, to_step_code)
        REFERENCES workflow_steps(workflow_id, step_code) ON DELETE CASCADE,
    
    -- Prevent duplicate transitions
    CONSTRAINT uq_workflow_transitions UNIQUE NULLS NOT DISTINCT (
        workflow_id, from_step_code, to_step_code, deleted_at
    ),
    
    CONSTRAINT chk_workflow_transitions_different CHECK (from_step_code != to_step_code)
);

-- =====================================================================
-- 8. MODULES TABLE
-- =====================================================================
-- Organizational modules for categorizing tickets
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT uq_modules_name_active UNIQUE NULLS NOT DISTINCT (name, deleted_at)
);

-- =====================================================================
-- 9. TAGS TABLE
-- =====================================================================
-- Reusable labels for tickets
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    color TEXT,  -- Hex color code for UI display
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT uq_tags_label_active UNIQUE NULLS NOT DISTINCT (label, deleted_at),
    CONSTRAINT chk_tags_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$')
);

-- =====================================================================
-- 10. TICKETS TABLE
-- =====================================================================
-- Main ticket entity with workflow tracking
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT NOT NULL,  -- Human-friendly code (e.g., TCK-1012)
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT NOT NULL DEFAULT 'Medium',
    
    -- Workflow tracking
    workflow_id UUID,
    step_code TEXT,  -- Current workflow step

    
    -- Assignment and ownership
    workgroup_id UUID,
    responsible_employee_id UUID,
    created_by UUID,  -- Audit: who created this ticket
    
    -- Module categorization
    module_id UUID,
    
    -- Date tracking
    start_date DATE,
    due_date DATE,
    initiate_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,  -- When ticket reached final state
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT fk_tickets_workflow FOREIGN KEY (workflow_id)
        REFERENCES workflows(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_workgroup FOREIGN KEY (workgroup_id)
        REFERENCES workgroups(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_responsible FOREIGN KEY (responsible_employee_id)
        REFERENCES employees(id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_created_by FOREIGN KEY (created_by)
        REFERENCES employees(id) ON DELETE SET NULL,
     CONSTRAINT fk_tickets_workflow_step FOREIGN KEY (workflow_id, step_code)
        REFERENCES workflow_steps(workflow_id, step_code) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_module FOREIGN KEY (module_id)
        REFERENCES modules(id) ON DELETE SET NULL,
    
    CONSTRAINT chk_tickets_status CHECK (
        status IN ('Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Cancelled')
    ),
    CONSTRAINT chk_tickets_priority CHECK (
        priority IN ('Low', 'Medium', 'High', 'Critical')
    ),
    CONSTRAINT chk_tickets_dates CHECK (
        due_date IS NULL OR start_date IS NULL OR due_date >= start_date
    ),
    CONSTRAINT uq_tickets_ticket_code UNIQUE (ticket_code)
);

-- =====================================================================
-- 11. TICKET TAGS TABLE
-- =====================================================================
-- Many-to-many relationship between tickets and tags
CREATE TABLE ticket_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT fk_ticket_tags_ticket FOREIGN KEY (ticket_id)
        REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_tags_tag FOREIGN KEY (tag_id)
        REFERENCES tags(id) ON DELETE CASCADE,
    
    CONSTRAINT uq_ticket_tags UNIQUE NULLS NOT DISTINCT (ticket_id, tag_id, deleted_at)
);

-- =====================================================================
-- 12. COMMENTS TABLE
-- =====================================================================
-- Ticket discussion thread
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    text TEXT NOT NULL,
    author_id UUID NOT NULL,  -- Changed from TEXT to UUID FK
    comment_type TEXT NOT NULL DEFAULT 'comment',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT fk_comments_ticket FOREIGN KEY (ticket_id)
        REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id)
        REFERENCES employees(id) ON DELETE SET NULL,
    
    CONSTRAINT chk_comments_type CHECK (
        comment_type IN ('comment', 'system', 'internal')
    )
);

-- =====================================================================
-- 13. ATTACHMENTS TABLE
-- =====================================================================
-- File attachment metadata (actual files stored in Cloudflare R2/S3)
-- NOTE: Does NOT store file_data BLOB; uses object storage instead
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT,  -- MIME type
    file_size BIGINT,  -- Size in bytes
    storage_key TEXT NOT NULL,  -- Object storage key (e.g., 'tickets/abc-123/file.pdf')
    storage_bucket TEXT NOT NULL DEFAULT 'liteboard-attachments',
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT fk_attachments_ticket FOREIGN KEY (ticket_id)
        REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_attachments_uploaded_by FOREIGN KEY (uploaded_by)
        REFERENCES employees(id) ON DELETE SET NULL,
    
    CONSTRAINT chk_attachments_size CHECK (file_size IS NULL OR file_size > 0)
);

-- =====================================================================
-- 14. STATUS HISTORY TABLE
-- =====================================================================
-- Comprehensive audit trail for all ticket changes
CREATE TABLE status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    activity_type TEXT NOT NULL,  -- 'status_change', 'field_change', 'transition', etc.
    field_name TEXT,  -- Which field changed (e.g., 'priority', 'responsible_employee_id')
    old_value TEXT,  -- Previous value (stored as TEXT for flexibility)
    new_value TEXT,  -- New value
    changed_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_status_history_ticket FOREIGN KEY (ticket_id)
        REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_history_changed_by FOREIGN KEY (changed_by)
        REFERENCES employees(id) ON DELETE SET NULL,
    
    CONSTRAINT chk_status_history_activity CHECK (
        activity_type IN (
            'created', 'status_change', 'field_change', 'transition', 
            'assigned', 'comment_added', 'attachment_added', 'deleted'
        )
    )
);

-- =====================================================================
-- 15. SYSTEM SETTINGS TABLE
-- =====================================================================
-- Application-level configuration key-value store
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL,
    setting_value JSONB,  -- Use JSONB for flexible structured data
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by)
        REFERENCES employees(id) ON DELETE SET NULL,
    
    CONSTRAINT uq_system_settings_key UNIQUE (setting_key)
);

-- =====================================================================
-- INDEXES - Performance optimization
-- =====================================================================

-- Employees
CREATE INDEX idx_employees_workgroup ON employees(workgroup_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_email ON employees(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_role ON employees(role_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_active ON employees(active) WHERE deleted_at IS NULL AND active = true;

-- Workflows
CREATE INDEX idx_workflows_active ON workflows(active) WHERE deleted_at IS NULL AND active = true;

-- Workflow Steps
CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_steps_workgroup ON workflow_steps(workgroup_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_steps_code ON workflow_steps(step_code) WHERE deleted_at IS NULL;

-- Workflow Transitions
CREATE INDEX idx_workflow_transitions_workflow ON workflow_transitions(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_transitions_from ON workflow_transitions(from_step_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_transitions_to ON workflow_transitions(to_step_code) WHERE deleted_at IS NULL;

-- Tickets (performance-critical for dashboard queries)
CREATE INDEX idx_tickets_ticket_code ON tickets(ticket_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_status ON tickets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_priority ON tickets(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_workgroup ON tickets(workgroup_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_responsible ON tickets(responsible_employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_created_by ON tickets(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_workflow ON tickets(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_module ON tickets(module_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_due_date ON tickets(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;
CREATE INDEX idx_tickets_created_at ON tickets(created_at) WHERE deleted_at IS NULL;

-- Composite index for common dashboard filter (workgroup + status)
CREATE INDEX idx_tickets_workgroup_status ON tickets(workgroup_id, status) 
    WHERE deleted_at IS NULL;

-- Composite index for user's assigned tickets
CREATE INDEX idx_tickets_responsible_status ON tickets(responsible_employee_id, status) 
    WHERE deleted_at IS NULL;

-- Full-text search on title and description
CREATE INDEX idx_tickets_title_trgm ON tickets USING gin(title gin_trgm_ops) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_description_trgm ON tickets USING gin(description gin_trgm_ops) 
    WHERE deleted_at IS NULL;

-- Ticket Tags
CREATE INDEX idx_ticket_tags_ticket ON ticket_tags(ticket_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ticket_tags_tag ON ticket_tags(tag_id) WHERE deleted_at IS NULL;

-- Comments
CREATE INDEX idx_comments_ticket ON comments(ticket_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at) WHERE deleted_at IS NULL;

-- Attachments
CREATE INDEX idx_attachments_ticket ON attachments(ticket_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by) WHERE deleted_at IS NULL;

-- Status History (audit queries)
CREATE INDEX idx_status_history_ticket ON status_history(ticket_id);
CREATE INDEX idx_status_history_created_at ON status_history(created_at);
CREATE INDEX idx_status_history_changed_by ON status_history(changed_by);
CREATE INDEX idx_status_history_activity ON status_history(activity_type);

-- Composite index for ticket audit trail
CREATE INDEX idx_status_history_ticket_created ON status_history(ticket_id, created_at DESC);

-- =====================================================================
-- FUNCTIONS & TRIGGERS - Auto-update timestamps
-- =====================================================================

-- Generic function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_workgroups_updated_at BEFORE UPDATE ON workgroups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- AUDIT TRIGGER - Auto-log ticket changes to status_history
-- =====================================================================

CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO status_history (
            ticket_id, activity_type, field_name, old_value, new_value, changed_by
        ) VALUES (
            NEW.id, 'status_change', 'status', OLD.status, NEW.status, 
            COALESCE(NEW.responsible_employee_id, NEW.created_by)
        );
    END IF;
    
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
            NEW.id, 'created', NULL, NULL, NEW.status,
            COALESCE(NEW.created_by, NEW.responsible_employee_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_ticket_changes
    AFTER INSERT OR UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION log_ticket_changes();

-- =====================================================================
-- VIEWS - Convenience queries for common operations
-- =====================================================================

-- Active tickets with employee and workflow details
CREATE VIEW v_active_tickets AS
SELECT 
    t.id,
    t.ticket_code,
    t.title,
    t.description,
    t.status,
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
FROM tickets t
LEFT JOIN workflows w ON t.workflow_id = w.id
LEFT JOIN workflow_steps ws ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
LEFT JOIN workgroups wg ON t.workgroup_id = wg.id
LEFT JOIN employees e ON t.responsible_employee_id = e.id
LEFT JOIN employees creator ON t.created_by = creator.id
LEFT JOIN modules m ON t.module_id = m.id
WHERE t.deleted_at IS NULL;

-- Employee workload summary
CREATE VIEW v_employee_workload AS
SELECT 
    e.id,
    e.name,
    e.email,
    wg.name AS workgroup_name,
    COUNT(t.id) FILTER (WHERE t.status = 'Open') AS open_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'In Progress') AS in_progress_tickets,
    COUNT(t.id) FILTER (WHERE t.status NOT IN ('Resolved', 'Closed', 'Cancelled')) AS active_tickets,
    COUNT(t.id) AS total_assigned_tickets
FROM employees e
LEFT JOIN workgroups wg ON e.workgroup_id = wg.id
LEFT JOIN tickets t ON e.id = t.responsible_employee_id AND t.deleted_at IS NULL
WHERE e.deleted_at IS NULL AND e.active = true
GROUP BY e.id, e.name, e.email, wg.name;

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) - Optional but recommended for multi-tenancy
-- =====================================================================
-- Uncomment to enable RLS for workgroup isolation
-- NOTE: Requires application to set session variables

-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY tickets_workgroup_isolation ON tickets
--     FOR ALL
--     TO PUBLIC
--     USING (
--         workgroup_id = current_setting('app.current_workgroup_id', true)::UUID
--         OR current_setting('app.user_role_id', true)::INTEGER = 1  -- Admins bypass
--     );

-- =====================================================================
-- GRANTS - Security permissions (adjust for your Neon setup)
-- =====================================================================
-- By default, Neon creates a role matching your database name
-- Adjust these based on your authentication setup

-- Example: Grant to application role
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO liteboard_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO liteboard_app;

-- =====================================================================
-- COMMENTS - Schema documentation
-- =====================================================================

COMMENT ON TABLE roles IS 'User permission levels (Admin, Editor, Viewer)';
COMMENT ON TABLE workgroups IS 'Organizational units for ticket isolation';
COMMENT ON TABLE employees IS 'User accounts with authentication and workgroup assignment';
COMMENT ON TABLE workflows IS 'Multi-step approval processes';
COMMENT ON TABLE workflow_steps IS 'Individual steps within workflows';
COMMENT ON TABLE workflow_transitions IS 'Valid state transitions between workflow steps';
COMMENT ON TABLE modules IS 'Organizational modules for categorizing tickets';
COMMENT ON TABLE tags IS 'Reusable labels for tickets';
COMMENT ON TABLE tickets IS 'Main ticket entity with workflow tracking';
COMMENT ON TABLE ticket_tags IS 'Many-to-many relationship between tickets and tags';
COMMENT ON TABLE comments IS 'Ticket discussion thread';
COMMENT ON TABLE attachments IS 'File metadata (actual files in object storage)';
COMMENT ON TABLE status_history IS 'Comprehensive audit trail for ticket changes';
COMMENT ON TABLE system_settings IS 'Application-level configuration';

COMMENT ON COLUMN attachments.storage_key IS 'Object storage path (e.g., tickets/{ticket_id}/{filename})';
COMMENT ON COLUMN attachments.storage_bucket IS 'S3/R2 bucket name';
COMMENT ON COLUMN workflow_steps.category_code IS '10=normal workflow step, 90=cancelled/rejected terminal state';
COMMENT ON COLUMN tickets.step_code IS 'Current position in workflow (FK to workflow_steps)';
COMMENT ON COLUMN tickets.ticket_code IS 'Human-friendly ticket identifier (e.g., TCK-1012)';
COMMENT ON COLUMN employees.password_hash IS 'bcrypt hash with cost factor 10';

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
-- Migration notes:
-- 1. This schema uses UUID primary keys instead of TEXT/INTEGER
-- 2. Soft deletion is implemented via deleted_at column
-- 3. Attachments no longer store BLOBs; use object storage instead
-- 4. Added workflow_transitions table (was missing in SQLite)
-- 5. Added created_by and updated_by audit fields where appropriate
-- 6. Email format validation added via CHECK constraint
-- 7. Partial indexes ensure unique constraints ignore soft-deleted rows
-- 8. Automatic audit logging via triggers for ticket changes
-- 9. Full-text search indexes using pg_trgm extension
-- 10. Views provided for common query patterns
-- =====================================================================
