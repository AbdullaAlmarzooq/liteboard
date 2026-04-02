import React from "react";
import { Edit2 } from "lucide-react";

const isProjectActive = (value) =>
  value === true || value === 1 || value === "1" || value === "true";

const getProjectCount = (project, field, fallbackArray) =>
  Number.parseInt(
    project?.[field] ??
      project?.[field.replace(/_([a-z])/g, (_, char) => char.toUpperCase())] ??
      (Array.isArray(project?.[fallbackArray]) ? project[fallbackArray].length : 0),
    10
  ) || 0;

const ProjectsTab = ({ projects, onEdit, onToggleActive }) => {
  if (!projects.length) {
    return <div className="text-center py-8 text-gray-500">No projects found</div>;
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => {
        const active = isProjectActive(project.active);
        const workgroupCount = getProjectCount(project, "workgroup_count", "workgroups");
        const workflowCount = getProjectCount(project, "workflow_count", "workflows");

        return (
          <div
            key={project.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {project.name}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{project.id}</span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {project.description || "No description provided."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Workgroups
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {workgroupCount}
                    </p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Workflows
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {workflowCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(project)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit project"
                  aria-label={`Edit ${project.name}`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => onToggleActive(project)}
                  className="relative inline-flex items-center h-6 w-12 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: active ? '#2563eb' : '#e5e7eb',
                    cursor: active ? 'pointer' : 'not-allowed'
                  }}
                  title={active ? 'Set inactive' : 'Set active'}
                  aria-label={active ? 'Active' : 'Inactive'}
                >
                  <span
                    className="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                    style={{
                      transform: active ? 'translateX(1.6rem)' : 'translateX(0.1rem)'
                    }}
                  />
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectsTab;
