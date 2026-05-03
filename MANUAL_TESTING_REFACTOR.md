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

## Phase 1G - Tags Feature Migration

Phase 1G moves `/api/tags` and `/api/ticket_tags` into `server/features/tags` with route, controller, and service layers. Existing tag-management URLs, ticket-tag relation URLs, middleware behavior, response payloads, and tag event logging should remain unchanged.

Expected behavior:

- `GET /api/tags` should still require authentication and apply project visibility filtering.
- `GET /api/tags?project_id=...` should still validate project access and active-project rules for non-admin users.
- `POST /api/tags`, `PUT /api/tags/:id`, and `DELETE /api/tags/:id` should remain Admin-only and continue writing admin tag events.
- `GET /api/ticket_tags/:ticketId` should still require authentication and readable ticket access.
- `POST /api/ticket_tags` should still require authentication and editable ticket state, then create a `tag.added` event.
- `DELETE /api/ticket_tags/:ticketId/:tagId` should still require authentication and editable ticket state, then create a `tag.removed` event.
- `PUT /api/ticket_tags/:ticketId` should still replace ticket tags in one transaction and write `tag.added`/`tag.removed` events for differences.

Suggested smoke checks:

- As Admin, create a test tag for a project and confirm it appears in Admin Panel tag management.
- Create a tag with the same label in a different project and confirm it is allowed.
- Attempt to create a second active tag with the same label in the same project and confirm it is rejected.
- Update the test tag label or color and confirm the change appears in tag lists and Audit Logs.
- Add the test tag to an editable ticket and confirm it appears on the ticket and in ticket activity.
- Replace a ticket's selected tags from Edit Ticket and confirm only added/removed tag activity entries are created.
- Remove the test tag from the ticket and confirm it disappears and activity still renders.
- Attempt tag add/remove/replace on a closed or cancelled ticket and confirm it is still blocked.
- Delete the test tag from Admin Panel only if the dataset is disposable.

## Phase 1H - Status History Migration

Phase 1H keeps `/api/status_history` as a public compatibility API, but moves its implementation under `server/features/tickets` because status-history records are ticket-scoped. Existing URLs, middleware behavior, response payloads, and transition/event behavior should remain unchanged.

Expected behavior:

- `GET /api/status_history?ticketId=...` should still require authentication and readable ticket access.
- Missing `ticketId` should still return `400` with `ticketId query parameter is required`.
- The GET response should still return transformed history rows with `type`, `fieldName`, `oldValue`, `newValue`, `timestamp`, and `changedBy`.
- `POST /api/status_history` should still use the existing ticket-editability middleware and create a manual history record with the same response shape.
- Ticket transitions should continue using the current ticket event/activity flow unchanged.

Suggested smoke checks:

- View a ticket timeline/activity and confirm transition events still render.
- Call `GET /api/status_history?ticketId=<ticket>` with an authenticated readable ticket and confirm any legacy history rows still load.
- Call `GET /api/status_history` without `ticketId` and confirm the existing `400` response.
- In a disposable dataset only, create a manual status-history record through `POST /api/status_history` and confirm it can be read back.
- Attempt the POST against a closed or cancelled ticket and confirm it is still blocked by ticket editability rules.

## Phase 2A - Workflows Feature Migration

Phase 2A moves workflow-related backend APIs into `server/features/workflows` with route, controller, and service layers. Existing workflow URLs, middleware behavior, response payloads, workflow SLA rules, transition behavior, and admin event logging should remain unchanged.

Expected behavior:

- `GET /api/workflows` and `GET /api/workflows/:id` should still require authentication and return active workflows with steps.
- `GET /api/workflows?project_id=...` should still enforce project access before returning project-assigned workflows.
- `GET /api/workflow_steps/allowed/:ticketId` should keep its existing unauthenticated middleware behavior and return adjacent steps plus the synthetic Cancelled option.
- `/api/workflow_transitions` should keep its existing unauthenticated middleware behavior for list, step lookup, create, update, and delete operations.
- `/api/workflow_management` should remain Admin-only for list, detail, create, update, active toggle, and delete.
- Admin workflow create/update should still validate SLA days, generate step codes, rebuild transitions, recalculate open ticket due dates, and write workflow/workflow-step admin events.

Suggested smoke checks:

- Open Admin Panel workflow management as an Admin and confirm workflow list/detail still load.
- Create a disposable workflow with at least two active steps and one terminal step, then confirm it appears in Admin Panel.
- Edit the workflow name, step order/name/workgroup, transition choices, and SLA settings, then confirm the save succeeds and Audit Logs show workflow/workflow-step activity.
- Toggle the workflow active state and confirm the response/UI matches previous behavior.
- From ticket create/edit flows, confirm project-scoped workflow dropdowns still load from `/api/workflows`.
- Open an existing ticket and confirm allowed workflow steps still load and transition behavior is unchanged.
- If using direct API checks, call `GET /api/workflow_transitions?workflow_id=<id>` and `GET /api/workflow_transitions/step/<step_code>` and compare the shape to the previous rows.

## Phase 2B - Smaller Server Feature Migrations

Phase 2B moves projects, workgroups, employees, and modules backend APIs into their own `server/features/*` folders with route, controller, and service layers. Existing URLs, middleware behavior, response payloads, project visibility rules, and admin event logging should remain unchanged.

Expected behavior:

- `/api/projects/available`, `/api/projects`, and `/api/projects/dashboard` should still require normal authentication and apply readable project filtering.
- `/api/projects/list`, `/api/projects/:id`, project create/update, and project assignment updates should remain Admin-only and continue logging project admin events.
- `/api/workgroups` should still list workgroups without auth, while create/update/delete remain Admin-only.
- `/api/employees/roles`, `/api/employees`, and `/api/employees/:id` should keep their existing no-auth read behavior, while employee create/update remain Admin-only.
- `/api/modules` and `/api/modules/:id` should still require authentication, including project-scoped module filtering on `project_id`.
- Module create/update/delete should remain Admin-only and continue logging module admin events.

Suggested smoke checks:

- As Admin, open Projects and confirm project list, dashboard counts, and project details still load.
- Create or edit a disposable project assignment set and confirm workgroup/workflow/module assignment changes persist and appear in Audit Logs.
- Open Admin Panel workgroups and confirm list, create, edit, activate/deactivate, and delete flows still behave as before.
- Open Admin Panel employees and confirm roles, employee list, employee detail/edit, password update, role change, and active toggle still behave as before.
- Open Admin Panel modules and confirm list, create, edit, activate/deactivate, delete, and duplicate-name validation still behave as before.
- In ticket create/edit flows, confirm module dropdowns still load from `/api/modules?project_id=<project>`.
