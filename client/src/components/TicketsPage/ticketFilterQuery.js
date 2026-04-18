export const createInitialTicketFilters = () => ({
  status: [],
  priority: [],
  workflow: [],
  workGroup: [],
  createdBy: [],
  responsible: [],
  module: [],
  tags: [],
  showOverdue: false,
});

const appendArrayValues = (params, key, values) => {
  if (!Array.isArray(values)) return;
  values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .forEach((value) => params.append(key, value));
};

export const appendTicketFilterParams = (params, filters = {}) => {
  appendArrayValues(params, "status", filters.status);
  appendArrayValues(params, "priority", filters.priority);
  appendArrayValues(params, "workflow", filters.workflow);
  appendArrayValues(params, "workgroup", filters.workGroup);
  appendArrayValues(params, "created_by", filters.createdBy);
  appendArrayValues(params, "responsible", filters.responsible);
  appendArrayValues(params, "module", filters.module);
  appendArrayValues(params, "tag", filters.tags);

  if (filters.showOverdue) {
    params.set("showOverdue", "true");
  }
};
