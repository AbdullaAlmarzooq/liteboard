const COMMENT_PREVIEW_LENGTH = 160;

const FIELD_LABELS = {
  title: "Title",
  module_id: "Module",
  priority: "Priority",
  start_date: "Start Date",
  due_date: "Due Date",
  responsible_employee_id: "Assigned",
};

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

module.exports = {
  buildCommentPreview,
  buildEventPresentation,
  insertEvent,
  mapEventRow,
};
