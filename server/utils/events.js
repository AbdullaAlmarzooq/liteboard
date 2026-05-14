const COMMENT_PREVIEW_LENGTH = 160;

const FIELD_LABELS = {
  title: "Title",
  module_id: "Module",
  priority: "Priority",
  start_date: "Start Date",
  due_date: "Due Date",
  responsible_employee_id: "Assigned",
};

const ADMIN_ENTITY_LABELS = {
  project: "project",
  module: "module",
  workflow: "workflow",
  workflow_step: "workflow step",
  tag: "tag",
  workgroup: "workgroup",
  user: "user",
  role: "role",
  permission: "permission",
  system_setting: "system setting",
};

const SENSITIVE_FIELD_PATTERN = /(password|password_hash|token|reset_token|secret)/i;

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildCommentPreview = (value, maxLength = COMMENT_PREVIEW_LENGTH) => {
  const preview = stripHtml(value);
  if (!preview) return "";
  if (preview.length <= maxLength) return preview;
  return `${preview.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
};

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return null;

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = unitIndex === 0 ? 0 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};

const formatDateValue = (value) => {
  if (!value) return "Empty";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatChangeValue = (change, side) => {
  const valueKey = side === "old" ? "old_value" : "new_value";
  const nameKey = side === "old" ? "old_name" : "new_name";

  if (change.field === "module_id") {
    return change[nameKey] || change[valueKey] || "Empty";
  }

  if (change.field === "start_date" || change.field === "due_date") {
    return formatDateValue(change[valueKey]);
  }

  const rawValue = change[valueKey];
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "Empty";
  }

  return String(rawValue);
};

const getActorName = (event) => {
  const actorName = String(event.actor_name || "").trim();
  return actorName || "Someone";
};

const getAdminActorName = (event) => {
  const actorName = String(event.actor_name || "").trim();
  return actorName || "Unknown actor";
};

const formatTicketUpdatedDetails = (payload) => {
  const changes = Array.isArray(payload?.changes) ? payload.changes : [];

  return changes.map((change) => {
    const label = FIELD_LABELS[change.field] || change.field;
    return `${label}: ${formatChangeValue(change, "old")} -> ${formatChangeValue(change, "new")}`;
  });
};

const buildEventPresentation = (event) => {
  const actor = getActorName(event);
  const payload = event.payload || {};

  switch (event.event_type) {
    case "ticket.created":
      return {
        message: `${actor} created ticket ${payload.ticket_code || event.ticket_code || ""}`.trim(),
        detail_lines: [],
      };

    case "ticket.updated":
      return {
        message: `${actor} updated the ticket`,
        detail_lines: formatTicketUpdatedDetails(payload),
      };

    case "ticket.assigned": {
      const oldName = payload.old_responsible_employee_name || "Unassigned";
      const newName = payload.new_responsible_employee_name || "Unassigned";

      return {
        message: `${actor} updated the assignee`,
        detail_lines: [`Assigned: ${oldName} -> ${newName}`],
      };
    }

    case "ticket.transitioned": {
      const fromStep = payload.from_step_name || payload.from_step_code || "Unknown";
      const toStep = payload.to_step_name || payload.to_step_code || "Unknown";

      return {
        message: `${actor} moved the ticket from ${fromStep} to ${toStep}`,
        detail_lines: [],
      };
    }

    case "comment.created": {
      const preview = payload.preview ? [payload.preview] : [];
      return {
        message: `${actor} added a comment`,
        detail_lines: preview,
      };
    }

    case "comment.edited":
      return {
        message: `${actor} edited a comment`,
        detail_lines: [],
      };

    case "attachment.uploaded": {
      const sizeLabel = formatFileSize(payload.file_size_bytes);
      const suffix = sizeLabel ? ` (${sizeLabel})` : "";
      return {
        message: `${actor} uploaded ${payload.filename || "an attachment"}${suffix}`,
        detail_lines: [],
      };
    }

    case "attachment.deleted": {
      const sizeLabel = formatFileSize(payload.file_size_bytes);
      const suffix = sizeLabel ? ` (${sizeLabel})` : "";
      return {
        message: `${actor} deleted ${payload.filename || "an attachment"}${suffix}`,
        detail_lines: [],
      };
    }

    case "tag.added":
      return {
        message: `${actor} added tag ${payload.tag_label || "tag"}`,
        detail_lines: [],
      };

    case "tag.removed":
      return {
        message: `${actor} removed tag ${payload.tag_label || "tag"}`,
        detail_lines: [],
      };

    default:
      if (String(event.event_type || "").startsWith("admin.")) {
        const credentialMessage = buildCredentialUpdateMessage(event, payload);

        return {
          message: credentialMessage || payload.message || buildAdminEventMessage({
            actorName: getAdminActorName(event),
            entity: payload.entity_type || event.entity_type,
            action: payload.action || String(event.event_type).split(".").pop(),
            entityName: payload.entity_name,
          }),
          detail_lines: formatAdminEventDetails(payload),
        };
      }

      return {
        message: `${actor} performed ${event.event_type}`,
        detail_lines: [],
      };
  }
};

const mapEventRow = (row) => {
  const presentation = buildEventPresentation(row);

  return {
    id: row.id,
    event_type: row.event_type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    ticket_id: row.ticket_id,
    ticket_code: row.ticket_code || null,
    ticket_title: row.ticket_title || null,
    actor_id: row.actor_id,
    actor_name: row.actor_name,
    payload: row.payload || {},
    occurred_at: row.occurred_at,
    created_at: row.created_at,
    message: presentation.message,
    detail_lines: presentation.detail_lines,
  };
};

const insertEvent = async (
  executor,
  {
    ticketId = null,
    eventType,
    entityType,
    entityId,
    actorId = null,
    actorName = null,
    payload = {},
    occurredAt = null,
  }
) => {
  await executor.query(
    `
      INSERT INTO events (
        ticket_id,
        event_type,
        entity_type,
        entity_id,
        actor_id,
        actor_name,
        payload,
        occurred_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, COALESCE($8, NOW()), NOW())
    `,
    [
      ticketId,
      eventType,
      entityType,
      entityId,
      actorId,
      actorName,
      JSON.stringify(payload || {}),
      occurredAt,
    ]
  );
};

const isSensitiveField = (field) => SENSITIVE_FIELD_PATTERN.test(String(field || ""));

const sanitizeAdminEventValue = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeAdminEventValue);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((safeValue, [key, entryValue]) => {
      if (!isSensitiveField(key)) {
        safeValue[key] = sanitizeAdminEventValue(entryValue);
      }
      return safeValue;
    }, {});
  }

  return value;
};

const valuesAreEqual = (left, right) => {
  const normalize = (value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value === undefined) {
      return null;
    }

    return value;
  };

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

const buildAdminChangePayload = (before = {}, after = {}, options = {}) => {
  const beforeSafe = sanitizeAdminEventValue(before || {});
  const afterSafe = sanitizeAdminEventValue(after || {});
  const fields = Array.isArray(options.fields) && options.fields.length
    ? options.fields
    : [...new Set([...Object.keys(beforeSafe), ...Object.keys(afterSafe)])];
  const fieldLabels = options.fieldLabels || {};

  const changes = fields
    .filter((field) => !isSensitiveField(field))
    .filter((field) => !valuesAreEqual(beforeSafe[field], afterSafe[field]))
    .map((field) => ({
      field,
      label: fieldLabels[field] || field,
      old_value: beforeSafe[field] ?? null,
      new_value: afterSafe[field] ?? null,
    }));

  return {
    changes,
    before: beforeSafe,
    after: afterSafe,
  };
};

const formatAdminEventDetails = (payload) => {
  const changes = Array.isArray(payload?.changes) ? payload.changes : [];

  const details = changes.map((change) => {
    const label = change.label || change.field;
    const oldValue = change.old_value === null || change.old_value === undefined || change.old_value === ""
      ? "Empty"
      : String(change.old_value);
    const newValue = change.new_value === null || change.new_value === undefined || change.new_value === ""
      ? "Empty"
      : String(change.new_value);

    return `${label}: ${oldValue} -> ${newValue}`;
  });

  if (payload?.credentials_updated) {
    const credentialLabel = payload.credential_type === "password" ? "Password" : "Credentials";
    details.push(`${credentialLabel}: Changed`);
  }

  return details;
};

const buildCredentialUpdateMessage = (event, payload) => {
  if (event.event_type !== "admin.user.updated" || !payload?.credentials_updated) {
    return null;
  }

  const actor = getAdminActorName(event);
  const targetName = payload.entity_name || event.entity_id;
  const changes = Array.isArray(payload.changes) ? payload.changes : [];

  if (payload.credential_type === "password") {
    if (changes.length > 0) {
      return `${actor} updated user "${targetName}" and changed their password`;
    }

    return `${actor} changed ${targetName}'s password`;
  }

  return `${actor} updated credentials for user "${targetName}"`;
};

const buildAdminEventMessage = ({
  actorName,
  entity,
  action,
  entityName,
}) => {
  const actor = String(actorName || "").trim() || "Unknown actor";
  const entityLabel = ADMIN_ENTITY_LABELS[entity] || String(entity || "item").replace(/_/g, " ");
  const target = entityName ? ` "${entityName}"` : "";

  switch (action) {
    case "created":
      return `${actor} created ${entityLabel}${target}`;
    case "updated":
      return `${actor} updated ${entityLabel}${target}`;
    case "deleted":
      return `${actor} deleted ${entityLabel}${target}`;
    case "activated":
      return `${actor} activated ${entityLabel}${target}`;
    case "deactivated":
      return `${actor} deactivated ${entityLabel}${target}`;
    case "role_changed":
      return `${actor} changed the role for ${entityLabel}${target}`;
    default:
      return `${actor} performed ${action || "an admin action"} on ${entityLabel}${target}`;
  }
};

const getActorFromRequest = (req) => ({
  actorId: req?.user?.id || null,
  actorName: req?.user?.name || null,
});

const getActorFromContext = ({ req, actor }) => {
  if (actor) {
    return {
      actorId: actor.id || actor.actorId || null,
      actorName: actor.name || actor.actorName || null,
    };
  }

  return getActorFromRequest(req);
};

const createAdminEvent = async (
  executor,
  {
    req,
    actor = null,
    entity,
    action,
    entityId,
    entityName = null,
    changes = [],
    before = null,
    after = null,
    payload = {},
    occurredAt = null,
  }
) => {
  const { actorId, actorName } = getActorFromContext({ req, actor });
  const eventType = `admin.${entity}.${action}`;
  const safePayload = sanitizeAdminEventValue({
    ...payload,
    entity_type: entity,
    entity_id: entityId ? String(entityId) : null,
    entity_name: entityName,
    action,
    changes,
    before,
    after,
  });

  const message = safePayload.message || buildAdminEventMessage({
    actorName,
    entity,
    action,
    entityName,
  });

  try {
    await insertEvent(executor, {
      ticketId: null,
      eventType,
      entityType: entity,
      entityId: entityId ? String(entityId) : null,
      actorId,
      actorName,
      payload: {
        ...safePayload,
        message,
      },
      occurredAt,
    });
  } catch (error) {
    if (error?.constraint === "chk_events_entity_type") {
      error.message =
        "Admin event logging requires migration 2026-05-01_expand_events_for_admin_actions.sql to be applied.";
    }

    throw error;
  }
};

module.exports = {
  buildAdminChangePayload,
  buildAdminEventMessage,
  buildCommentPreview,
  buildEventPresentation,
  createAdminEvent,
  insertEvent,
  mapEventRow,
  sanitizeAdminEventValue,
};
