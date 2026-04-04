# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

## [2026-04-04]

### Changed
- README was refreshed to reflect the current PostgreSQL/Neon setup, active environment variables, and the removal of old SQLite migration tooling.

### Removed
- Legacy SQLite migration utilities, tracked SQLite database artifacts, and checked-in frontend build output were removed from the repository to match the current PostgreSQL-only runtime.

## [2026-04-03]


### Changed
- Dashboard `Active Tickets` now counts workflow categories `Open` and `In Progress` from ticket step category data instead of excluding only `Closed` and `Cancelled` by display status text.
- Dashboard `Active Tickets by WorkGroup` now counts workflow categories `Open` and `In Progress` from ticket step category data instead of display status text.
- Dashboard `Tickets by Priority` now counts only active tickets in workflow categories `Open` and `In Progress`, excluding closed and cancelled tickets.
- Dashboard `Pending Tickets by Module` now matches the bar-chart visual style used by `Pending Tickets Per Type` and `Pending Tickets by Status`, and counts only active tickets.
- Profile `Tickets Assigned to Me` and `Workgroup Tickets` now show only active tickets in workflow categories `Open` and `In Progress`, matching the filtered profile charts.
- Profile `My Recent Activity` and `Pending Workgroup Tickets` now use server-side pagination with a default first page of 10 items instead of front-loading larger result sets.
- ProfileActivity now uses a dedicated `/api/profile/overview` endpoint for its cards and charts instead of the heavier `/api/tickets` payload.
- ProfileActivity no longer blocks the full page on overview loading, `/api/profile/overview` now includes user metadata so the extra employee fetch is gone, and the overview backend was collapsed into a single summary query.

## [2026-04-01]

### Added
- Admin Tag creation modal now requires selecting a project so new tags can be created in the correct project scope.
- Admin Tag deletion now uses a confirmation modal consistent with other Admin Panel dialogs.

### Changed
- Dashboard Project filter is now integrated into the main filter bar as the leftmost control with a compact inline layout and refined dark-mode styling.
- Tickets page Project filter now follows the same unified filter-bar pattern as Dashboard, with matching visual treatment and a refreshed search panel layout.
- Admin Panel `Tags` tab now uses a project-grouped table view with sticky project divider rows, denser row spacing, and simplified columns/actions for faster scanning.
- Admin Tag edit actions now use a calmer non-destructive cancel affordance to better distinguish canceling from deleting.
- Tags API now returns `project_id` and `project_name` so project-scoped Admin views can display and group tags correctly.
- Tag creation API now persists `project_id` and returns project metadata for newly created tags.

### Fixed
- Tag creation no longer uses the legacy sequential `TAG-###` ID path and now matches the PostgreSQL UUID-based schema used in Neon.
- Admin Tags view no longer falls back to `Unassigned Project` for project-owned tags when the backend has valid project assignments.
- Edit Ticket page now loads only tags that belong to the ticket's project instead of showing tags from all projects.
- Ticket update flow now validates that submitted tags belong to the ticket's project, preventing cross-project tag assignment through direct requests.
- Single-ticket API responses now include project metadata needed for project-scoped edit flows.

## [2026-02-29]


### Added
- PostgreSQL schema foundation for project-based organization and visibility:
  - New `projects` table with audit timestamps and active flag.
  - New `project_workgroups` table for assigning multiple workgroups to a project.
  - New `project_workflows` table for assigning multiple workflows to a project.
- DB migration script `server/db/migrations/2026-03-28_backfill_default_project.sql` to seed `PRJ-001`, assign all existing workgroups, backfill all existing tickets/tags, and validate that no migrated ticket or tag remains without a project.
- Nullable `project_id` columns on `tickets` and `tags` to support a staged projects rollout without breaking existing records or queries.
- Ticket middleware `server/middleware/ensureProjectAccess.js` to enforce project membership on protected ticket routes with admin bypass.
- Admin-only project management API `server/routes/projects.js` with project CRUD plus dedicated workgroup/workflow assignment endpoints.
- Project-first ticket creation flow with project-scoped project options, workflows, and tags for the create-ticket experience.
- Admin Panel `Projects` tab with project create/edit, activation, and assignment management UI.
- New `/projects` frontend page with project-level ticket analytics cards and click-through navigation to filtered tickets.
- New `GET /api/projects/dashboard` endpoint for project-level ticket counts by workflow category.

### Changed
- Ticket, tag, dashboard, and profile read paths now enforce project visibility for non-admin users via `project_workgroups`, while admins continue to bypass read restrictions.
- Ticket-adjacent read endpoints (`attachments`, `comments`, `status_history`, `ticket_tags`) now follow the same project visibility rules to prevent side-channel access to hidden tickets.
- Ticket middleware enforcement now protects `GET /tickets/:id`, `PUT /tickets/:id`, `DELETE /tickets/:id`, and `POST /tickets/:id/transition` through `ensureProjectAccess`.
- Existing `ensureSameWorkgroup` behavior remains unchanged and continues to govern workgroup-based modification rules.
- Server now exposes `/api/projects` admin routes for viewing projects, updating project metadata, and managing project workgroup/workflow assignments without changing ticket or workflow execution behavior.
- Ticket creation now requires `project_id`, validates project access/activity, and rejects workflows or tags that are outside the selected project.
- `/api/projects/available` now provides project choices for ticket creation, while `/api/workflows` and `/api/tags` support project-scoped filtering through `project_id`.
- Create Ticket UX now requires project selection first, hides workflows/tags until a project is chosen, and resets workflow/tag/form state when the selected project changes.
- Project create/update APIs now reject empty workgroup/workflow assignments, and project update can persist metadata plus assignments together for admin management flows.
- Admin Panel now surfaces projects alongside employees/tags/workgroups/modules/workflows and reflects backend project state, assignment counts, and active/inactive status.
- `GET /api/projects` now serves readable projects to authenticated users, while still returning full assignment detail for Admin management screens.
- Dashboard and Tickets pages now support project filtering with project-aware reset behavior for existing filters.
- Navigation now includes a user-facing `Projects` page, and project cards deep-link into the Tickets page using `?project_id=...`.
- README now documents the Projects architecture, including the split between project-based ticket visibility and existing workflow-step workgroup edit permissions.
- README now includes updated Middleware and Access Control sections covering project middleware enforcement and the unchanged workgroup-based write guard.
- README now documents the admin-only project management endpoints and the assignment model for projects, workgroups, and workflows.
- README now documents the project-based ticket creation flow and the backend validation rules behind it.
- README now documents the Admin Project Management UI and how workgroup/workflow assignments affect project access and behavior.
- README now documents project visibility filters, the new Projects overview page, and the new project dashboard API.
- README now documents the Step 2 default-project migration flow for existing Neon databases.
- Schema documentation now notes the staged project rollout and the new project-scoped tag/ticket fields.

## [2026-02-15]

### Added
- DB migration script `server/db/migrations/2026-02-15_drop_legacy_ticket_status.sql` to complete legacy `tickets.status` retirement in Neon.

### Changed
- Tickets API write paths now update workflow state using `step_code` only (no writes to `tickets.status`) for transition/create/update flows.
- Tickets API read paths now expose status from workflow step name (`COALESCE(workflow_steps.step_name, tickets.step_code)`) while returning `step_code`.
- Ticket audit trigger (`log_ticket_changes`) now tracks creation/transition using `step_code` and no longer references `OLD.status`/`NEW.status`.
- Schema views were refactored away from `tickets.status`:
  - `v_active_tickets` now exposes `current_step_name` and `step_category_code`.
  - `v_employee_workload` now calculates workload counts from `workflow_steps.category_code`.
- Schema indexes were refactored from status-based to step-based for ticket filtering and assignment queries.

### Removed
- Legacy `chk_tickets_status` constraint from project schema and migration path.
- Legacy status-based indexes (`idx_tickets_status`, `idx_tickets_workgroup_status`, `idx_tickets_responsible_status`) from migration path.
- Unmounted duplicate transition route file (`server/routes/ticketTransitions.js`).

## [2026-02-14]

### Added
- Dashboard top-row chart `Pending Tickets Per Type` (grouped by workflow name), positioned between `Active Tickets` and `Active Tickets by WorkGroup`.

### Changed
- Edit Ticket now resolves displayed status from workflow step name (`current_step_name`) instead of legacy `tickets.status`.
- View Ticket now resolves displayed status from workflow step name (`current_step_name`) instead of legacy `tickets.status`.
- Dashboard Status filter now uses workflow step names (`current_step_name`) for options and filtering.
- Dashboard `Tickets by Status` now groups by workflow step names (`current_step_name`).
- Profile chart title updated from `My Tickets by Workflow` to `Assigned Tickets`.
- Profile `Assigned Tickets` and `Workgroup Tickets by Status` now exclude closed/cancelled categories (30/40).
- Profile `Workgroup Tickets by Status` now counts by workflow step name (`current_step_name`).
- Create Ticket page width increased for a wider layout (`max-w-4xl`).
- Server now enforces terminal ticket locking by workflow category (`30/40`) across write endpoints (tickets/comments/attachments/tags/status history), including direct URL/API calls.
- Edit Ticket route now auto-redirects terminal tickets to View Ticket with a clear toast message.
- Tickets page and View Ticket page now hide edit actions for terminal tickets to match backend locking behavior.
- Delete ticket actions are now hidden on terminal tickets (category `30/40`) to match the same lock rule as edit.
- Delete confirmation modal now shows `ticket_code` instead of UUID.
- Ticket lifecycle now maintains `tickets.completed_at` from workflow category state (`30=closed` sets timestamp, non-closed clears it) in create/update/transition flows.

### Fixed
- Edit Ticket preview message under workflow diagram now uses correct workflow step names (`current_step_name`) for from/to text.
- Dashboard `Tickets by Priority` now includes `Critical` priority in counts.
- Edit Ticket comment actions now surface backend error messages (e.g., terminal-state lock reason) instead of generic failure text.
- Added schema trigger function (`sync_ticket_completed_at`) so `completed_at` stays consistent whenever `workflow_id/step_code` changes.

## [2026-02-13]

### Added
- Tickets filter now supports `Created By` using creator display names (not user IDs).
- Rich text editor for ticket descriptions (`TicketEditor`) using Quill toolbar features (headings, formatting, lists, blockquote, code block, colors, links).
- Login page password visibility toggle icon for masked/unmasked input.

### Changed
- Tickets page ordering now prioritizes last update time (`updated_at` descending), with creation time fallback.
- Tickets search results now follow the same latest-updated-first ordering for consistency.
- Tags tab UI now shows the tag label once (inside the colored tag chip) to remove duplicate label rendering.
- Ticket create/edit forms now use rich HTML description input while still storing in `tickets.description`.
- View Ticket page now renders rich description content (headings/lists/blockquote/code/links) with improved section layout.
- View Ticket ticket-information panel now shows only creator name (no employee UUID) and stacks the priority badge under its label.

### Fixed
- Tags edit form now pre-fills existing tag values (label/color) when entering edit mode.
- Tags edit save now calls the correct tags API endpoint (`PUT /api/tags/:id`) instead of the employees endpoint.
- Server-side HTML sanitization on ticket create/update prevents unsafe description payloads (supports `mailto` links).
- Ticket create/update status mapping now uses workflow category mapping to satisfy status constraints when step names are custom.
- Quill toolbar duplicate-render issue in create/edit ticket pages.

## [2026-02-12]

### Added
- Dashboard filter now supports Workflow with the same existing filter UI pattern.
- Tickets filter now supports Workflow by workflow name (not workflow code).
- CSV export now includes Workflow as the second column and no longer exports UUID.
- Workflow admin API now includes `GET /api/workflow_management/:id` for fast single-workflow fetch in edit modal.

### Changed
- Workflow category model standardized to 4 codes: `10=Open`, `20=In Progress`, `30=Closed`, `40=Cancelled`.
- Workflow create/update now normalizes legacy `90` to `40` for backward compatibility.
- Workflow transition inserts now use upsert-on-constraint to prevent duplicate transition failures during workflow updates.
- Workflow edit modal now hydrates from latest DB data on open (fast single-workflow fetch).
- Tickets page status display now uses current workflow step label while color is derived from workflow category.
- Category code exposure was removed from non-admin workflow/ticket transition responses; admin workflow screens still manage categories.

### Fixed
- React Flow `ResizeObserver` runtime loop noise in workflow tab.
- Workflow edit save flow now shows clear success/error toasts and closes modal on successful save.
- Workflow update failures caused by duplicate `workflow_transitions` inserts (`uq_workflow_transitions` conflict).
- Workflow edit modal reopening with stale/default category values.

### Schema
- Updated schema check constraint for workflow step categories to `IN (10, 20, 30, 40)`.
- Updated workflow step category column comments to reflect the 4-category model.
- For existing Neon databases, existing constraints/data may need one-time SQL migration (legacy `90 -> 40` and constraint recreation).

## [2026-02-09]

### Added
- PostgreSQL (Neon) schema with UUID primary keys and soft-delete support.
- Ticket human-readable `ticket_code` alongside UUID `id` for sharing (e.g., `TCK-1012`).
- Workflow transitions with composite FK to `(workflow_id, step_code)`.
- Views for common queries: `v_active_tickets`, `v_employee_workload`.
- Migration verification script updated to reflect current schema and environment loading.
- `attachment_blobs` table to store base64 payloads separately from attachment metadata.
- On-demand attachment blob endpoint to reduce payload size when listing tickets.
- Workflow active/inactive toggle support (reactivation allowed).
- Profile analytics charts: tickets by workflow (bar) and workgroup status (pie).

### Changed
- Migration script updated to normalize workflow step categories and ticket statuses for PostgreSQL constraints.
- Date normalization during migration (empty string → NULL) for PostgreSQL `DATE` columns.
- Schema constraints aligned for composite workflow step references.
- Schema updated to remove `employee_skills` and associated indexes/comments.
- Server DB layer now uses `DATABASE_URL` (Neon) with `pg` and converted routes to PostgreSQL queries.
- Tickets API now returns `ticket_code` and `workflowName`, and supports UUID or `ticket_code` identifiers.
- Attachments API stores metadata in `attachments` and base64 data in `attachment_blobs` (fetch blobs only when needed).
- Admin workflow management now respects category constraints and uses toggleable active status.
- Frontend updated to display `ticket_code` in all ticket views/exports and hide UUIDs in admin lists.
- Profile header now shows role/workgroup names (not IDs), with user details refreshed from API.

### Fixed
- Migration foreign key mismatches for workflow steps.
- Invalid status values and empty date inputs during migration.
- Activity log now shows comment author names.
- Workflow creation failure due to missing category normalization in server route.
- Profile charts now populate correct workflow and workgroup data.

### Migration Notes
- SQLite → PostgreSQL data migration completed successfully.
- Attachments BLOBs are not migrated (object storage expected).

[Unreleased]: https://keepachangelog.com/en/1.1.0/
