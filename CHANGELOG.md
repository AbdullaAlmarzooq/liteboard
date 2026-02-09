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

### Changed
- Migration script updated to normalize workflow step categories and ticket statuses for PostgreSQL constraints.
- Date normalization during migration (empty string → NULL) for PostgreSQL `DATE` columns.
- Schema constraints aligned for composite workflow step references.
- Schema updated to remove `employee_skills` and associated indexes/comments.

### Fixed
- Migration foreign key mismatches for workflow steps.
- Invalid status values and empty date inputs during migration.

### Migration Notes
- SQLite → PostgreSQL data migration completed successfully.
- Attachments BLOBs are not migrated (object storage expected).

[Unreleased]: https://keepachangelog.com/en/1.1.0/
