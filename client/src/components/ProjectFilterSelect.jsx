import React from "react";

const ProjectFilterSelect = ({
  projects = [],
  selectedProjectId = "",
  onChange,
  label = "Project",
  allLabel = "All accessible projects",
  disabled = false,
  compact = false,
}) => {
  const containerClassName = compact
    ? "flex items-center gap-3"
    : "flex flex-col gap-2";

  const labelClassName = compact
    ? "text-sm font-medium text-blue-700 dark:text-slate-300"
    : "text-sm font-medium text-gray-700 dark:text-gray-300";

  const selectClassName = compact
    ? "min-w-[220px] px-3 py-2.5 border border-blue-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/80 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-500 dark:focus:border-slate-500 disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-700"
    : "min-w-[260px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-700";

  return (
    <div className={containerClassName}>
      <label className={labelClassName}>
        {label}
      </label>
      <select
        value={selectedProjectId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={selectClassName}
      >
        <option value="">{allLabel}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProjectFilterSelect;
