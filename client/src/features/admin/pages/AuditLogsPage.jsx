import { useFetch, apiUrl } from "../../../lib/api";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronsUpDown, RotateCcw, Search } from "lucide-react";
import { Card, CardContent } from "../../../components/Card";
import Pagination from "../../../components/Pagination";

const initialFilters = {
  search: "",
  actor_id: "",
  entity_type: "",
  event_type: "",
  action: "",
  date_from: "",
  date_to: "",
};

const formatDateTime = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const humanize = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const stringifyValue = (value) => {
  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const AuditLogsPage = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState({});
  const [sortDirection, setSortDirection] = useState("desc");

  const { data: filterOptions } = useFetch(apiUrl("/api/audit-logs/filters"));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.actor_id,
    filters.entity_type,
    filters.event_type,
    filters.action,
    filters.date_from,
    filters.date_to,
    itemsPerPage,
    sortDirection,
  ]);

  const auditLogsUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      sort: "occurred_at",
      direction: sortDirection,
    });

    if (debouncedSearch) params.set("search", debouncedSearch);
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "search" && value) params.set(key, value);
    });

    return apiUrl(`/api/audit-logs?${params.toString()}`);
  }, [currentPage, debouncedSearch, filters, itemsPerPage, sortDirection]);

  const { data, isPending, error } = useFetch(auditLogsUrl);
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number(data?.total) || 0;

  const actors = Array.isArray(filterOptions?.actors) ? filterOptions.actors : [];
  const entityTypes = Array.isArray(filterOptions?.entityTypes) ? filterOptions.entityTypes : [];
  const eventTypes = Array.isArray(filterOptions?.eventTypes) ? filterOptions.eventTypes : [];
  const actions = Array.isArray(filterOptions?.actions) ? filterOptions.actions : [];

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const toggleExpanded = (id) => {
    setExpandedRows((current) => ({ ...current, [id]: !current[id] }));
  };

  const toggleSortDirection = () => {
    setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
  };

  const renderSelect = (key, label, options, allLabel = "All") => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <select
        value={filters[key]}
        onChange={(event) => updateFilter(key, event.target.value)}
        className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={typeof option === "string" ? option : option.id} value={typeof option === "string" ? option : option.id}>
            {typeof option === "string" ? option : option.name}
          </option>
        ))}
      </select>
    </label>
  );

  const renderDetails = (log) => {
    const payload = log.payload && typeof log.payload === "object" ? log.payload : {};
    const changes = Array.isArray(payload.changes) ? payload.changes : [];
    const details = Array.isArray(log.details) ? log.details : [];

    return (
      <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
        {details.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-gray-900 dark:text-white">Details</p>
            <ul className="space-y-1 text-gray-700 dark:text-gray-300">
              {details.map((detail, index) => (
                <li key={`${log.id}-detail-${index}`}>{detail}</li>
              ))}
            </ul>
          </div>
        )}

        {changes.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-gray-900 dark:text-white">Changes</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                    <th className="py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Field</th>
                    <th className="py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Before</th>
                    <th className="py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">After</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change, index) => (
                    <tr key={`${log.id}-change-${index}`} className="border-b border-gray-200 last:border-0 dark:border-gray-700">
                      <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200">
                        {change.label || humanize(change.field)}
                      </td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{stringifyValue(change.old_value)}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{stringifyValue(change.new_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {payload.before && (
          <SnapshotBlock title="Before Snapshot" value={payload.before} />
        )}

        {payload.after && (
          <SnapshotBlock title="After Snapshot" value={payload.after} />
        )}

        {!details.length && !changes.length && !payload.before && !payload.after && (
          <SnapshotBlock title="Payload" value={payload} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
          <label className="flex flex-col gap-1 text-sm lg:col-span-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search events, actors, messages, ticket IDs..."
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Date From</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(event) => updateFilter("date_from", event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Date To</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(event) => updateFilter("date_to", event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </label>

          {renderSelect("actor_id", "Actor", actors, "All actors")}
          {renderSelect("entity_type", "Entity Type", entityTypes, "All entities")}
          {renderSelect("event_type", "Event Type", eventTypes, "All events")}
          {renderSelect("action", "Action", actions, "All actions")}

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>{total} event{total === 1 ? "" : "s"}</span>
            {isPending && <span>Loading...</span>}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700">
                  <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    <button type="button" onClick={toggleSortDirection} className="inline-flex items-center gap-1">
                      Time
                      <ChevronsUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Actor</th>
                  <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Event</th>
                  <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Entity</th>
                  <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Message</th>
                  <th className="p-3 text-left font-medium text-gray-700 dark:text-gray-300">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <Fragment key={log.id}>
                    <tr key={log.id} className="border-b border-gray-300 hover:bg-blue-50 dark:border-gray-600 dark:hover:bg-gray-700/50">
                      <td className="whitespace-nowrap p-3 text-sm text-gray-700 dark:text-gray-300">{formatDateTime(log.occurred_at)}</td>
                      <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{log.actor_name || "Unknown actor"}</td>
                      <td className="p-3 font-mono text-sm text-gray-700 dark:text-gray-300">{log.event_type}</td>
                      <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium">{humanize(log.entity_type)}</div>
                        <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{log.ticket_code || log.entity_id}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-white">{log.message}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(log.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          aria-label={expandedRows[log.id] ? "Collapse details" : "Expand details"}
                        >
                          {expandedRows[log.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                    {expandedRows[log.id] && (
                      <tr className="border-b border-gray-300 dark:border-gray-600">
                        <td colSpan="6" className="p-3">
                          {renderDetails(log)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 lg:hidden">
            {items.map((log) => (
              <div key={log.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.message}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(log.occurred_at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(log.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    aria-label={expandedRows[log.id] ? "Collapse details" : "Expand details"}
                  >
                    {expandedRows[log.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <p><span className="font-medium">Actor:</span> {log.actor_name || "Unknown actor"}</p>
                  <p><span className="font-medium">Event:</span> <span className="font-mono">{log.event_type}</span></p>
                  <p><span className="font-medium">Entity:</span> {humanize(log.entity_type)} <span className="font-mono text-xs">{log.ticket_code || log.entity_id}</span></p>
                </div>
                {expandedRows[log.id] && <div className="mt-4">{renderDetails(log)}</div>}
              </div>
            ))}
          </div>

          {!isPending && items.length === 0 && (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">
              No audit logs found for the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination
        totalItems={total}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

const SnapshotBlock = ({ title, value }) => (
  <div>
    <p className="mb-2 font-medium text-gray-900 dark:text-white">{title}</p>
    <pre className="max-h-80 overflow-auto rounded-md bg-white p-3 text-xs text-gray-700 dark:bg-gray-950 dark:text-gray-300">
      {JSON.stringify(value || {}, null, 2)}
    </pre>
  </div>
);

export default AuditLogsPage;
