# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

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
