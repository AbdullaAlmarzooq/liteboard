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

## Phase 2C - Auth, Profile, and Audit Logs Feature Migration

Phase 2C moves auth, profile, and audit-log backend APIs into `server/features/auth`, `server/features/profile`, and `server/features/audit-logs`. Existing URLs, middleware behavior, login/session token behavior, profile activity behavior, and audit-log pagination/filtering should remain unchanged.

Expected behavior:

- `POST /api/auth/login` should still validate email/password, block inactive accounts, sign the same JWT payload, and return the same user object.
- `/api/profile/stats`, `/api/profile/overview`, `/api/profile/activity`, `/api/profile/my-tickets`, and `/api/profile/myPassword` should still require normal authentication.
- `/api/profile/activity/global` should remain Admin-only.
- `/api/profile/activity` and `/api/profile/my-tickets` should keep pagination behavior and project access filtering.
- `/api/audit-logs` and `/api/audit-logs/filters` should remain Admin-only.
- Audit logs should keep server-side pagination, search, actor/entity/event/action/date filtering, sorting, and mapped event details.

Suggested smoke checks:

- Log in with a valid active user and confirm the returned token and user shape still match the frontend expectations.
- Attempt login with a bad password and confirm the existing invalid-credentials response.
- Open Profile overview and activity pages and confirm stats, charts, recent activity, and workgroup tickets load.
- Change the current user's password only in a disposable account and confirm old/new password validation behaves as before.
- As Admin, open global activity and Audit Logs; test search, filters, sorting, pagination, and expanded details.
- As non-Admin, confirm Audit Logs and global activity remain blocked.

## Phase 2D - Server Refactor Verification

Phase 2D verifies the server-side feature refactor before client migration starts. No client code, schema, API URLs, or business behavior should change in this phase.

Verification expectations:

- `server/server.js` should mount active API routers from `server/features/*`.
- Legacy `server/routes/*` compatibility re-exports should be absent after final cleanup.
- No duplicate `app.use("/api/...")` mounts should exist.
- Feature route files should import without broken module paths.
- Backend startup should still return the root API health response.

Full backend regression checklist:

- Auth: valid login, invalid login, inactive account rejection, JWT expiry behavior, and user payload shape.
- Tickets: list, search, export, detail, create, update, delete, creator-only fields, project access, workgroup access, terminal lock, transition, allowed steps, and event activity.
- Status history: authenticated read, missing `ticketId` validation, manual insert if still used, and terminal-ticket blocking.
- Comments: list, create, edit, delete, ownership checks, terminal-ticket blocking, and comment events.
- Attachments: list metadata, fetch blob, upload below 1 MB, reject above limit, delete, terminal-ticket blocking, and attachment events.
- Tags: project-scoped tag list, create/update/delete, duplicate label in same project blocked, duplicate label across projects allowed, ticket add/remove/replace, and tag events.
- Workflows: active workflow reads, project-scoped workflow reads, allowed-step helper, transition APIs, Admin workflow CRUD, SLA validation, due-date recalculation, and workflow admin events.
- Projects: available projects, project dashboard counts, Admin project list/detail/create/update, and workgroup/workflow/module assignment replacement.
- Workgroups: list, create, edit, activate/deactivate, delete, and admin events.
- Employees: roles, list, detail, create, update, password update, role change, active toggle, and admin events.
- Modules: authenticated list/detail, project-scoped list, create/update/delete, duplicate-name validation, and admin events.
- Profile: stats, overview, personal activity, global Admin activity, workgroup tickets, password change, pagination, and project access filtering.
- Audit Logs: filter metadata, paginated list, search, actor/entity/event/action/date filters, sorting, detail expansion, and Admin-only access.

Suggested final smoke:

- Start the backend and confirm `GET /` returns the LiteBoard API health response.
- Confirm unauthenticated protected APIs still return `401`.
- Log in as Admin and exercise Admin Panel projects, workflows, tags, modules, workgroups, employees, and audit logs.
- Log in as Editor/Viewer and confirm project visibility and role restrictions remain unchanged.

## Phase 3A - Client Feature Folder Migration

Phase 3A moves client pages and feature-specific components under `client/src/features/*` while preserving the same route URLs, UI behavior, API calls, file extensions, and existing `useFetch.js` usage. Login remains in `client/src/pages` for now, and shared primitives remain in `client/src/components`.

Expected behavior:

- Sidebar and direct URL navigation should still reach the same screens.
- Dashboard, Tickets, Create Ticket, View Ticket, Edit Ticket, Projects, Profile, Admin Panel, and Audit Logs should render as before.
- Ticket filters, search, pagination, export, comments, attachments, tags, transitions, and edit actions should keep using the same API calls.
- Admin tabs and modals for projects, workflows, tags, modules, workgroups, and employees should behave as before.
- Profile overview/activity and Audit Logs pagination/filtering should still work.

Suggested smoke checks:

- Start the frontend and log in as an Admin.
- Navigate through Dashboard, Tickets, Projects, Profile, Audit Logs, and Admin Panel from the sidebar.
- Open `/tickets`, `/create-ticket`, `/view-ticket/:id`, and `/edit-ticket/:id` directly in the browser and confirm route protection still works.
- On Tickets, test project filtering, search, pagination, and export.
- Open a ticket and confirm comments, attachments, tags, status history, and allowed transitions still render.
- As Admin, open each Admin Panel tab and confirm list data and modals load.
- Log in as a non-Admin and confirm Admin-only navigation/routes remain blocked.

## Phase 3B - Central Client API Helper

Phase 3B replaces hardcoded frontend API host strings and the old standalone `useFetch.js` file with `client/src/lib/api.js`. Endpoint paths, request methods, authentication headers, response handling, and the default local API host should remain unchanged.

Expected behavior:

- Omitting `REACT_APP_API_URL` should still call the local backend at `http://localhost:8000`.
- Setting `REACT_APP_API_URL` before `npm start` or `npm run build` should point all client API calls at that base URL.
- Authenticated GET requests should still include the same Bearer token behavior and missing-token errors.
- Imperative authenticated writes should still use the same JSON headers and return raw `Response` objects to callers.
- Login should still work without a token and should store the returned token/user in `localStorage`.

Suggested smoke checks:

- Start backend and frontend without `REACT_APP_API_URL`; log in and confirm Dashboard data loads.
- Open Tickets and confirm list, project filter, search, pagination, export, view, edit, and delete flows still hit the same endpoint paths.
- Create a disposable ticket and confirm project/workflow/module/tag dropdown data still loads.
- Open a ticket and test comments, attachments, allowed transitions, and status activity.
- Open Projects, Profile, Audit Logs, and each Admin Panel tab as Admin.
- Restart the frontend with `REACT_APP_API_URL=http://localhost:8000` and confirm the same screens still load.

## Phase 4B - Final Cleanup Regression

Phase 4B removes old compatibility files after the backend and client feature structures are active. API URLs, client route URLs, middleware behavior, database schema, and user-visible behavior should remain unchanged.

Expected behavior:

- `server/server.js` should import API routers directly from `server/features/*`.
- No active import should reference deleted `server/routes/*`, old client page paths, old feature-specific component folders, `client/src/useFetch.js`, or `client/src/utils/fetchWithAuth.js`.
- The only remaining hardcoded local API host should be the default fallback in `client/src/lib/api.js`.
- Empty feature skeletons may remain only where future work is intentionally pending.

Full regression checklist:

- Auth: login success, invalid login, inactive account handling, token storage, logout, and protected route redirects.
- Dashboard: project filter, workflow/status/module/workgroup filtering, charts, loading states, and non-admin project visibility.
- Tickets: list, filter options, search, pagination, export, create, view, edit, restricted creator-only fields, delete, and terminal-ticket locking.
- Ticket detail: comments, attachments, tag display, status history/activity, allowed transitions, workflow transition, and attachment blob download.
- Projects: overview cards, project deep links into Tickets, Admin project create/update, and assignment replacement.
- Admin Panel: employees, tags, workgroups, modules, workflows, projects, modal open/save/cancel, duplicate validation, active toggles, and audit events.
- Profile: overview stats, charts, personal activity, assigned tickets, workgroup tickets, pagination, and password change.
- Audit Logs: filters, search, sorting, pagination, row expansion, and Admin-only access.
- API environment: run once with the default local API host and once with `REACT_APP_API_URL=http://localhost:8000`.
