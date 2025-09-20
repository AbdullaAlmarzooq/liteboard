-- Enable foreign key constraints (run this for each connection)
PRAGMA foreign_keys = ON;

-- 1. WORKGROUPS TABLE
CREATE TABLE workgroups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. EMPLOYEES TABLE
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    position TEXT,
    department TEXT,
    workgroup_code TEXT,
    active INTEGER DEFAULT 1, -- SQLite uses 1/0 for boolean
    joined_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workgroup_code) REFERENCES workgroups(id)
);

-- 3. EMPLOYEE SKILLS TABLE (Many-to-Many relationship)
CREATE TABLE employee_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT,
    skill TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, skill)
);

-- 4. WORKFLOWS TABLE
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. WORKFLOW STEPS TABLE
CREATE TABLE workflow_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT,
    step_code TEXT UNIQUE NOT NULL,
    step_name TEXT NOT NULL,
    workgroup_code TEXT,
    step_order INTEGER NOT NULL,
    category_code INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (workgroup_code) REFERENCES workgroups(id),
    UNIQUE(workflow_id, step_order)
);

-- 6. MODULES TABLE
CREATE TABLE modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. TAGS TABLE
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    label TEXT UNIQUE NOT NULL,
    color TEXT, -- hex color code
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. TICKETS TABLE (Main entity)
CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT NOT NULL DEFAULT 'Medium',
    workflow_id TEXT,
    step_code TEXT,
    workgroup_id TEXT,
    responsible_employee_id TEXT,
    module TEXT,
    start_date DATE,
    due_date DATE,
    initiate_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
    FOREIGN KEY (step_code) REFERENCES workflow_steps(step_code),
    FOREIGN KEY (workgroup_id) REFERENCES workgroups(id),
    FOREIGN KEY (responsible_employee_id) REFERENCES employees(id)
);

-- 9. TICKET TAGS TABLE (Many-to-Many relationship)
CREATE TABLE ticket_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT,
    tag_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(ticket_id, tag_id)
);

-- 10. COMMENTS TABLE
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- 11. ATTACHMENTS TABLE
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_data BLOB, -- or store file path if using file system
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- 12. STATUS HISTORY TABLE (Audit Trail)
CREATE TABLE status_history (
    id TEXT PRIMARY KEY,
    ticket_id TEXT,
    activity_type TEXT NOT NULL, -- 'status_change', 'field_change', etc.
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- 13. SYSTEM SETTINGS TABLE (Optional - for configuration)
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);

-- INDEXES (SQLite requires separate CREATE INDEX statements)
CREATE INDEX idx_employees_workgroup ON employees(workgroup_code);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_workgroup ON workflow_steps(workgroup_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_due_date ON tickets(due_date);
CREATE INDEX idx_tickets_responsible ON tickets(responsible_employee_id);
CREATE INDEX idx_tickets_workgroup ON tickets(workgroup_id);
CREATE INDEX idx_tickets_workflow ON tickets(workflow_id);
CREATE INDEX idx_ticket_tags_ticket ON ticket_tags(ticket_id);
CREATE INDEX idx_ticket_tags_tag ON ticket_tags(tag_id);
CREATE INDEX idx_comments_ticket ON comments(ticket_id);
CREATE INDEX idx_comments_timestamp ON comments(timestamp);
CREATE INDEX idx_attachments_ticket ON attachments(ticket_id);
CREATE INDEX idx_status_history_ticket ON status_history(ticket_id);
CREATE INDEX idx_status_history_timestamp ON status_history(timestamp);
CREATE INDEX idx_status_history_type ON status_history(activity_type);

-- TRIGGERS for updated_at columns (SQLite doesn't support ON UPDATE CURRENT_TIMESTAMP)
CREATE TRIGGER update_workgroups_timestamp 
    AFTER UPDATE ON workgroups
    BEGIN
        UPDATE workgroups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_employees_timestamp 
    AFTER UPDATE ON employees
    BEGIN
        UPDATE employees SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_workflows_timestamp 
    AFTER UPDATE ON workflows
    BEGIN
        UPDATE workflows SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_modules_timestamp 
    AFTER UPDATE ON modules
    BEGIN
        UPDATE modules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_tags_timestamp 
    AFTER UPDATE ON tags
    BEGIN
        UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_tickets_timestamp 
    AFTER UPDATE ON tickets
    BEGIN
        UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_system_settings_timestamp 
    AFTER UPDATE ON system_settings
    BEGIN
        UPDATE system_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;