# LiteBoard Event System

## Purpose

The LiteBoard event system is the new business-level activity foundation for:

- the `Activity Log` shown on the View Ticket page
- the `My Recent Activity` section shown on the Profile page
- future outbound integrations and automation use cases

This system is intentionally separate from `status_history`.

- `events` is the new user-facing business event stream
- `status_history` remains the legacy audit mechanism and is not modified by this design

The event system is designed to be:

- normalized where possible
- snapshot-based only where needed for durable history
- backend-owned for consistent message generation
- extensible for future integrations

## Core Principles

### 1. Single Event Table

All business events are stored in a single `events` table.

This avoids scattering activity logic across multiple audit tables and gives LiteBoard one consistent source for timeline rendering and recent activity queries.

### 2. Business-Level Events, Not Raw Row Audits

The table stores business actions such as:

- `ticket.updated`
- `ticket.transitioned`
- `comment.created`
- `attachment.deleted`

It does not try to mirror every SQL mutation blindly.

### 3. Normalize First

The event system keeps stable references normalized:

- `ticket_id`
- `entity_type`
- `entity_id`
- `actor_id`

It only stores snapshots when later rendering would otherwise become unreliable after renames or deletes.

### 4. Backend-Generated Messages

Human-readable activity text is generated in the backend from structured payloads.

This guarantees consistent timeline wording across the application and keeps frontend rendering simpler.

### 5. Ticket-Centric Querying

Many events belong to child entities such as comments, attachments, and tags, but they still participate in the ticket timeline through `ticket_id`.

`ticket_id` is nullable so the system can later support global/system events that are not tied to a ticket.

## Database Model

The table is created by:

- [server/db/migrations/2026-04-11_add_events_table.sql](/Users/abdullaalmarzooq/liteboard/server/db/migrations/2026-04-11_add_events_table.sql)

The canonical schema is defined in:

- [server/db/schema.sql](/Users/abdullaalmarzooq/liteboard/server/db/schema.sql)

### Table Definition

`events`

Columns:

- `id UUID PRIMARY KEY`
- `ticket_id UUID NULL`
- `event_type TEXT NOT NULL`
- `entity_type TEXT NOT NULL`
- `entity_id UUID NOT NULL`
- `actor_id UUID NULL`
- `actor_name TEXT NULL`
- `payload JSONB NOT NULL DEFAULT '{}'::jsonb`
- `occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `deleted_at TIMESTAMPTZ NULL`

Constraints:

- `entity_type IN ('ticket', 'comment', 'attachment', 'tag')`
- `event_type` must not be blank
- `payload` must be a JSON object
- `actor_id -> employees(id)`
- `ticket_id -> tickets(id)`

### Indexes

The event system is optimized for the main LiteBoard read patterns.

Entity timeline lookup:

- `(entity_type, entity_id, occurred_at DESC)`

Ticket timeline lookup:

- `(ticket_id, occurred_at DESC)` where `ticket_id IS NOT NULL`

Recent activity sorting:

- `(occurred_at DESC)`

Filter by event type:

- `(event_type, occurred_at DESC)`

Filter by actor:

- `(actor_id, occurred_at DESC)` where `actor_id IS NOT NULL`

## Event Identity Model

Each event row answers four separate questions:

### What ticket does this belong to?

- `ticket_id`

Examples:

- A ticket update event uses `ticket_id = ticket.id`
- A comment creation event uses `ticket_id = comment.ticket_id`

### What business action happened?

- `event_type`

Examples:

- `ticket.created`
- `comment.edited`
- `attachment.uploaded`

### What entity was directly affected?

- `entity_type`
- `entity_id`

Examples:

- `ticket` + ticket UUID
- `comment` + comment UUID
- `attachment` + attachment UUID
- `tag` + tag UUID

### Who performed the action?

- `actor_id`
- `actor_name`

`actor_id` remains normalized to `employees.id`.

`actor_name` is a snapshot so timelines remain readable if the employee name changes later.

## Payload Contract

Payloads use internal/backend naming conventions only.

Examples:

- `due_date`
- `module_id`
- `responsible_employee_id`
- `step_code`

Display labels are not stored in field keys.

Snapshots are included only where needed for durable messages or deleted-history integrity.

### `ticket.created`

Entity:

- `entity_type = 'ticket'`
- `entity_id = ticket.id`
- `ticket_id = ticket.id`

Payload:

```json
{
  "ticket_code": "TCK-1042"
}
```

Reason:

- at creation time, the full record already exists in `tickets`
- only `ticket_code` is duplicated because it is useful in timeline messages

### `ticket.updated`

Entity:

- `entity_type = 'ticket'`
- `entity_id = ticket.id`
- `ticket_id = ticket.id`

Purpose:

- grouped non-assignment, non-transition field updates from one save action

Supported fields:

- `title`
- `module_id`
- `priority`
- `start_date`
- `due_date`

Payload:

```json
{
  "changes": [
    {
      "field": "priority",
      "old_value": "High",
      "new_value": "Low"
    },
    {
      "field": "module_id",
      "old_value": "9b8c2c3d-1111-2222-3333-444444444444",
      "new_value": "7a6d5e4f-5555-6666-7777-888888888888",
      "old_name": "Operations",
      "new_name": "Finance"
    },
    {
      "field": "due_date",
      "old_value": "2026-04-20",
      "new_value": "2026-04-25"
    }
  ]
}
```

Rules:

- `field` always uses the canonical internal field name
- IDs are stored as `old_value` and `new_value` where appropriate
- name snapshots such as `old_name` and `new_name` are included only where IDs alone are not readable enough for messages

### `ticket.assigned`

Entity:

- `entity_type = 'ticket'`
- `entity_id = ticket.id`
- `ticket_id = ticket.id`

Payload:

```json
{
  "old_responsible_employee_id": "uuid-or-null",
  "new_responsible_employee_id": "uuid-or-null",
  "old_responsible_employee_name": "Sara Ali",
  "new_responsible_employee_name": "Ali Hasan"
}
```

Reason:

- assignment changes are important enough to deserve a dedicated business event
- employee-name snapshots preserve history if the employee record later changes

### `ticket.transitioned`

Entity:

- `entity_type = 'ticket'`
- `entity_id = ticket.id`
- `ticket_id = ticket.id`

Payload:

```json
{
  "workflow_id": "uuid",
  "from_step_code": "OPEN",
  "to_step_code": "IN_PROGRESS",
  "from_step_name": "Open",
  "to_step_name": "In Progress"
}
```

Reason:

- `step_code` values are canonical integration-friendly values
- `step_name` values are snapshots used for durable message rendering

### `comment.created`

Entity:

- `entity_type = 'comment'`
- `entity_id = comment.id`
- `ticket_id = comment.ticket_id`

Payload:

```json
{
  "comment_type": "comment",
  "preview": "Customer confirmed the issue started after the latest update."
}
```

Rules:

- preview only, not full comment content
- preview is plain text, trimmed and shortened in the backend

### `comment.edited`

Entity:

- `entity_type = 'comment'`
- `entity_id = comment.id`
- `ticket_id = comment.ticket_id`

Payload:

```json
{
  "comment_type": "comment"
}
```

Reason:

- this event only needs to support simple messages like `Ahmed edited a comment`
- before/after previews are intentionally not stored

### `attachment.uploaded`

Entity:

- `entity_type = 'attachment'`
- `entity_id = attachment.id`
- `ticket_id = attachment.ticket_id`

Payload:

```json
{
  "filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "file_size_bytes": 1293943
}
```

Rules:

- metadata only
- never store blob/base64/storage payloads in events

### `attachment.deleted`

Entity:

- `entity_type = 'attachment'`
- `entity_id = attachment.id`
- `ticket_id = attachment.ticket_id`

Payload:

```json
{
  "filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "file_size_bytes": 1293943
}
```

Reason:

- attachment metadata must survive deletion for durable history

### `tag.added`

Entity:

- `entity_type = 'tag'`
- `entity_id = tag.id`
- `ticket_id = ticket.id`

Payload:

```json
{
  "tag_label": "Urgent",
  "tag_color": "#EF4444"
}
```

Rule:

- `tag_id` is not duplicated in payload because `entity_id` already represents the tag

### `tag.removed`

Entity:

- `entity_type = 'tag'`
- `entity_id = tag.id`
- `ticket_id = ticket.id`

Payload:

```json
{
  "tag_label": "Urgent",
  "tag_color": "#EF4444"
}
```

Reason:

- tag label/color snapshots preserve readable history after rename or delete

## Event Emission Rules

The backend owns event creation.

Clients should not write activity rows directly.

### Ticket creation

When a ticket is created:

- emit `ticket.created`
- emit `tag.added` for any initial tags assigned during create

### Ticket update

When a standard ticket update happens:

- emit one `ticket.updated` if any grouped tracked fields changed
- emit one `ticket.assigned` if responsible employee changed
- emit one `ticket.transitioned` if step/workflow position changed
- emit `tag.added` / `tag.removed` for tag differences

This means one save action may generate multiple events.

That is intentional and preferable to overloading one event with unrelated concerns.

### Comments

When a comment is created:

- emit `comment.created`

When a comment is edited:

- emit `comment.edited`

### Attachments

When an attachment is uploaded:

- emit `attachment.uploaded`

When an attachment is deleted:

- emit `attachment.deleted`

### Direct tag operations

When tags are added/removed through ticket-tag routes:

- emit `tag.added`
- emit `tag.removed`

## Backend Implementation

Shared event logic lives in:

- [server/utils/events.js](/Users/abdullaalmarzooq/liteboard/server/utils/events.js)

Responsibilities:

- insert rows into `events`
- build plain-text comment previews
- map event rows into API response objects
- generate backend-owned human-readable messages and detail lines

### Event-producing routes

- [server/routes/tickets.js](/Users/abdullaalmarzooq/liteboard/server/routes/tickets.js)
- [server/routes/comments.js](/Users/abdullaalmarzooq/liteboard/server/routes/comments.js)
- [server/routes/attachments.js](/Users/abdullaalmarzooq/liteboard/server/routes/attachments.js)
- [server/routes/tickets_tags.js](/Users/abdullaalmarzooq/liteboard/server/routes/tickets_tags.js)

### Event-consuming routes

Ticket timeline:

- `GET /api/tickets/:id/events`

Implemented in:

- [server/routes/tickets.js](/Users/abdullaalmarzooq/liteboard/server/routes/tickets.js)

Profile recent activity:

- `GET /api/profile/activity`

Implemented in:

- [server/routes/profile/activity.js](/Users/abdullaalmarzooq/liteboard/server/routes/profile/activity.js)

## Message Generation

The frontend does not assemble raw audit fragments anymore.

The backend returns already interpreted activity such as:

- `Ahmed created ticket TCK-1042`
- `Ahmed updated the ticket`
- `Ahmed updated the assignee`
- `Ahmed moved the ticket from Open to In Progress`
- `Ahmed added a comment`
- `Ahmed edited a comment`
- `Ahmed uploaded photo.jpg (1.23 MB)`
- `Ahmed deleted photo.jpg (1.23 MB)`
- `Ahmed added tag Urgent`

For grouped updates, the backend also returns detail lines such as:

- `Priority: High -> Low`
- `Module: Operations -> Finance`
- `Due Date: Apr 20, 2026 -> Apr 25, 2026`

## Frontend Consumption

Updated components:

- [client/src/components/ViewTicket.js](/Users/abdullaalmarzooq/liteboard/client/src/components/ViewTicket.js)
- [client/src/components/Profile/RecentActivity.jsx](/Users/abdullaalmarzooq/liteboard/client/src/components/Profile/RecentActivity.jsx)

Behavior:

- View Ticket now reads ticket activity from `/api/tickets/:id/events`
- Profile recent activity now reads event rows from `/api/profile/activity`
- client-side writes to `status_history` were removed from the ticket edit flow

## Legacy `status_history`

`status_history` is still present and still works as the legacy audit table.

Important:

- it was not deleted
- it was not repurposed
- it is no longer the source for the user-facing ticket timeline or profile recent activity in the new event system

This separation reduces coupling and avoids breaking older audit behavior while the new event model takes over the product-facing activity features.

## Current Scope

Implemented event types:

- `ticket.created`
- `ticket.updated`
- `ticket.assigned`
- `ticket.transitioned`
- `comment.created`
- `comment.edited`
- `attachment.uploaded`
- `attachment.deleted`
- `tag.added`
- `tag.removed`

Tracked grouped ticket fields in `ticket.updated`:

- `title`
- `module_id`
- `priority`
- `start_date`
- `due_date`

Tracked separately:

- responsible employee changes through `ticket.assigned`
- workflow/step/status movement through `ticket.transitioned`

## Known Limitations

### No historical backfill yet

Existing legacy activity was not backfilled into `events`.

As a result:

- the new event-driven views show activity from this rollout forward
- older activity still exists in `status_history`, but is not automatically reflected in the new event timeline

### Entity type scope is intentionally narrow

Current system-owned `entity_type` values are:

- `ticket`
- `comment`
- `attachment`
- `tag`

This is deliberate.

It keeps the contract small and controlled until LiteBoard adds more event-producing domains.

## Future Extension Guidance

When adding new event types later:

1. Prefer a new explicit business event over reusing an unrelated event type.
2. Keep payload keys canonical and backend-oriented.
3. Store snapshots only when:
   - the source row may be deleted
   - the source label may change later
   - the value is required for durable message generation
4. Keep `ticket_id` nullable so non-ticket events remain possible in the future.
5. Emit events in the same transaction as the business write whenever possible.

## Recommended Next Enhancements

- add backfill tooling if historical event continuity is required
- add automated tests for event emission on ticket/comment/attachment/tag flows
- add optional integration dispatch off the `events` table for webhooks or async workers
- add richer timeline UI formatting for grouped detail lines

