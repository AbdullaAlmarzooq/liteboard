const getTicketLabel = (event) => {
  const ticketCode = typeof event?.ticket_code === "string" ? event.ticket_code.trim() : "";
  return ticketCode || "this ticket";
};

const getUpdatedSummary = (payload, ticketLabel) => {
  const changes = Array.isArray(payload?.changes) ? payload.changes : [];
  const fields = new Set(
    changes
      .map((change) => (typeof change?.field === "string" ? change.field.trim() : ""))
      .filter(Boolean)
  );

  if (fields.size === 0) {
    return `Updated ${ticketLabel}`;
  }

  const onlyDates = [...fields].every((field) => field === "start_date" || field === "due_date");
  if (onlyDates) {
    return `Adjusted dates on ${ticketLabel}`;
  }

  if (fields.has("title")) {
    const hasUnrelatedField = [...fields].some(
      (field) => field !== "title" && field !== "start_date" && field !== "due_date"
    );
    return hasUnrelatedField ? `Updated ${ticketLabel}` : `Renamed ${ticketLabel}`;
  }

  if (fields.has("priority")) {
    const hasUnrelatedField = [...fields].some(
      (field) => field !== "priority" && field !== "start_date" && field !== "due_date"
    );
    return hasUnrelatedField ? `Updated ${ticketLabel}` : `Changed priority on ${ticketLabel}`;
  }

  if (fields.has("module_id")) {
    const hasUnrelatedField = [...fields].some(
      (field) => field !== "module_id" && field !== "start_date" && field !== "due_date"
    );
    return hasUnrelatedField ? `Updated ${ticketLabel}` : `Changed module on ${ticketLabel}`;
  }

  return `Updated ${ticketLabel}`;
};

export function buildActivitySummary(event) {
  const ticketLabel = getTicketLabel(event);
  const payload = event && typeof event.payload === "object" && event.payload !== null ? event.payload : {};

  switch (event?.event_type) {
    case "ticket.created":
      return `Created ${ticketLabel}`;

    case "ticket.updated":
      return getUpdatedSummary(payload, ticketLabel);

    case "ticket.assigned": {
      const assignee =
        typeof payload.new_responsible_employee_name === "string"
          ? payload.new_responsible_employee_name.trim()
          : "";
      return assignee
        ? `Assigned ${ticketLabel} to ${assignee}`
        : `Removed assignee from ${ticketLabel}`;
    }

    case "ticket.transitioned":
      return `Moved ${ticketLabel} to ${payload.to_step_name}`;

    case "comment.created":
      return `Commented on ${ticketLabel}`;

    case "comment.edited":
      return `Edited a comment on ${ticketLabel}`;

    case "attachment.uploaded":
      return `Uploaded ${payload.filename} to ${ticketLabel}`;

    case "attachment.deleted":
      return `Deleted ${payload.filename} from ${ticketLabel}`;

    case "tag.added":
      return `Added tag '${payload.tag_label}' to ${ticketLabel}`;

    case "tag.removed":
      return `Removed tag '${payload.tag_label}' from ${ticketLabel}`;

    default:
      return event?.message;
  }
}
