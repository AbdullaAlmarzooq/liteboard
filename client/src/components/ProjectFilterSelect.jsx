import React from "react";

const ProjectFilterSelect = ({
  projects = [],
  selectedProjectId = "",
  onChange,
  label = "Project",
  allLabel = "All accessible projects",
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        value={selectedProjectId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-w-[260px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-700"
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
