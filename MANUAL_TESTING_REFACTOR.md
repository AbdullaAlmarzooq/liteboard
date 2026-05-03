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

## Phase 1B - Tickets Router Feature Mount

Phase 1B moves the existing tickets router behind `server/features/tickets` and keeps `/api/tickets` mounted at the same URL. No ticket business logic, middleware behavior, API responses, or database schema should change in this phase.

Expected behavior:

- Every existing `/api/tickets` endpoint should remain available at the same URL.
- Ticket list, filter options, search, export, detail, events, create, update, transition, allowed steps, and delete flows should behave as before.
- Existing project access, role access, workgroup access, terminal ticket locking, creator-only fields, SLA status, and event logging rules should be unchanged.
- `/api/status_history` remains separately mounted and should behave as before.

Suggested smoke checks:

- Start the backend and confirm `GET /` still returns the LiteBoard API health response.
- Log in through the frontend and open the Tickets page.
- Open an existing ticket detail page and confirm tags, comments, attachments, events, and status history still load.
- As an Admin or Editor in a safe dataset, create a test ticket and transition it through one valid workflow step.
- Confirm a non-creator still cannot edit ticket title or description.

## Phase 1C - Tickets Service Extraction

Phase 1C moves ticket SQL and business rules into `server/features/tickets/tickets.service.js`. The `/api/tickets` router should still expose the same URLs, middleware behavior, status codes, and response bodies.

Expected behavior:

- Ticket list, filter options, search, export, detail, events, create, update, transition, allowed steps, and delete flows should behave as before.
- Ticket event/activity logging should still create the same event types for create, update, assign, transition, tag add, and tag removal.
- Ticket detail should still include tags, comments, and attachments as before.
- Project, role, workgroup, terminal-state, and creator-only edit rules should remain unchanged.

Suggested smoke checks:

- Confirm `GET /api/tickets/list` still returns paginated tickets for an authenticated user.
- Confirm `GET /api/tickets/:id` still returns tags, comments, attachments, SLA status, and legacy alias fields.
- Create a ticket with valid project/workflow/module/tag assignments in a safe dataset.
- Update a ticket's assignee/module/tags in a safe dataset and confirm activity entries still render.
- Attempt a creator-only title/description edit as a non-creator and confirm it is still rejected.

## Phase 1D - Tickets Controller Extraction

Phase 1D moves `/api/tickets` HTTP request/response handling into `server/features/tickets/tickets.controller.js`. Routes should still expose the same URLs and middleware chains, and the service should still own ticket SQL and business logic.

Expected behavior:

- All `/api/tickets` status codes and response bodies should match the previous service-backed router behavior.
- Validation errors, forbidden creator-only edits, missing tickets, duplicate ticket codes, and fallback server errors should still return the same messages.
- Route middleware behavior should be unchanged for auth, project access, workgroup access, and terminal-ticket edit checks.

Suggested smoke checks:

- Confirm unauthenticated ticket endpoints still return authentication errors.
- List tickets with `GET /api/tickets/list` and confirm pagination metadata (`items`, `total`, `page`, `limit`) still returns.
- Search tickets with `GET /api/tickets/search?q=...` and confirm filtered results still return.
- Export tickets with `GET /api/tickets/export` and confirm the export payload still includes `items` and `total`.
- View a ticket with `GET /api/tickets/:id` and confirm tags, comments, attachments, SLA status, and legacy alias fields still return.
- Confirm `GET /api/tickets/:id/events` still returns mapped event messages.
- Create a ticket with `POST /api/tickets` in a safe dataset and confirm the `201` payload still includes `message`, `id`, and `ticket_code`.
- Update a ticket as its creator with `PUT /api/tickets/:id` and confirm the existing success payload is unchanged.
- Attempt a restricted title/description update as a non-creator and confirm it is still rejected.
- Transition a ticket with `POST /api/tickets/:id/transition` and confirm the previous success payload is unchanged.
- Delete a safe test ticket with `DELETE /api/tickets/:id` only if the dataset is disposable.

## Phase 1E - Comments Feature Migration

Phase 1E moves `/api/comments` into `server/features/comments` with route, controller, and service layers. The existing `/api/comments` URL, middleware behavior, response payloads, and event logging behavior should remain unchanged.

Expected behavior:

- `GET /api/comments?ticketId=...` should still require authentication and readable ticket access.
- `POST /api/comments` should still require authentication and editable ticket state, then create a `comment.created` event.
- `PUT /api/comments/:id` should still require authentication, editable ticket state, and comment ownership, then create a `comment.edited` event.
- `DELETE /api/comments/:id` should still require authentication, editable ticket state, and comment ownership. Existing behavior does not write a delete event.

Suggested smoke checks:

- View comments for a ticket the user can read.
- Add a comment to an editable ticket and confirm it appears in ticket activity.
- Edit your own comment and confirm the edit succeeds and activity still renders.
- Attempt to edit another user's comment and confirm it is rejected.
- Delete your own comment on a safe test ticket and confirm it is removed.
- Attempt comment create/edit/delete on a closed or cancelled ticket and confirm it is still blocked.

## Phase 1F - Attachments Feature Migration

Phase 1F moves `/api/attachments` into `server/features/attachments` with route, controller, and service layers. The existing `/api/attachments` URL, middleware behavior, response payloads, inline blob storage, size validation, and event logging behavior should remain unchanged.

Expected behavior:

- `GET /api/attachments/:ticketId` should still require authentication and readable ticket access, then return attachment metadata.
- `GET /api/attachments/:id/blob` should still require authentication and project-readable ticket access, then return `{ attachment_id, base64_data }`.
- `POST /api/attachments` should still require authentication and editable ticket state, enforce required fields and the 1 MB limit, store the inline blob, and create an `attachment.uploaded` event.
- `DELETE /api/attachments/:id` should still require authentication and editable ticket state, delete the attachment, and create an `attachment.deleted` event.

Suggested smoke checks:

- View attachment metadata for a ticket the user can read.
- Download or preview an existing attachment and confirm the blob endpoint still returns data.
- Upload a small attachment to an editable safe test ticket and confirm it appears in the attachment list and activity.
- Attempt to upload a file larger than 1 MB and confirm it is rejected.
- Delete the test attachment and confirm it is removed and activity still renders.
- Attempt attachment upload/delete on a closed or cancelled ticket and confirm it is still blocked.
