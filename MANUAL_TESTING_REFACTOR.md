# Manual Testing - Feature-Based Refactor

This checklist tracks manual verification during the staged feature-based refactor.

## Phase 0 - Preparation Only

Phase 0 creates placeholder feature folders and documentation for the refactor. No route files, client components, middleware, API URLs, or database schema should change in this phase.

Expected behavior:

- Login should behave the same as before.
- Dashboard, Projects, Tickets, Create Ticket, Profile, Admin Panel, and Audit Logs should load as before for users with the same roles.
- Existing API endpoints should keep the same URLs and responses.
- Ticket create, view, edit, transition, comments, attachments, tags, workflow, project, employee, module, workgroup, and audit-log flows should be unchanged.
- No database migration should be required.

Suggested smoke checks:

- Start the backend and frontend with the normal project commands.
- Log in as an Admin and confirm Dashboard, Tickets, Projects, Admin Panel, and Audit Logs still open.
- Log in as an Editor or Viewer, if available, and confirm existing role restrictions still behave as before.
- Open an existing ticket and confirm comments, attachments, status history, and allowed actions render normally.
- Create or edit a test ticket only in a safe non-production dataset.
