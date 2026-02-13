# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

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
