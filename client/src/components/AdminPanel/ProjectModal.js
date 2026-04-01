import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import Button from "../Button";
import Badge from "../Badge";

const isProjectActive = (value) =>
  value === true || value === 1 || value === "1" || value === "true";

const createInitialForm = (project) => ({
  id: project?.id || "",
  name: project?.name || "",
  description: project?.description || "",
  active: project ? isProjectActive(project.active) : true,
  workgroupCodes: Array.isArray(project?.workgroups)
    ? project.workgroups.map((workgroup) => workgroup.code)
    : [],
  workflowIds: Array.isArray(project?.workflows)
    ? project.workflows.map((workflow) => workflow.id)
    : [],
});

const ProjectModal = ({
  isOpen,
  project,
  workgroups,
  workflows,
  isSaving,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState(createInitialForm(project));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm(createInitialForm(project));
    setError("");
  }, [isOpen, project]);

  if (!isOpen) return null;

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const values = prev[field] || [];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];

      return {
        ...prev,
        [field]: nextValues,
      };
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!form.workgroupCodes.length) {
      setError("Select at least one workgroup.");
      return;
    }

    if (!form.workflowIds.length) {
      setError("Select at least one workflow.");
      return;
    }

    setError("");
    onSave({
      id: form.id || undefined,
      name: form.name.trim(),
      description: form.description.trim(),
      active: form.active,
      workgroupCodes: form.workgroupCodes,
      workflowIds: form.workflowIds,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {project ? "Edit Project" : "Create Project"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Assign at least one workgroup and one workflow.
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Project Status
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    form.active
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                      : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="project-status"
                      checked={!!form.active}
                      onChange={() => setForm((prev) => ({ ...prev, active: true }))}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Active</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Project is available for normal use and assignment.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    !form.active
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                      : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="project-status"
                      checked={!form.active}
                      onChange={() => setForm((prev) => ({ ...prev, active: false }))}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Inactive</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Project stays in the system but should not be used for new work.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter project description"
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Workgroups</h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {form.workgroupCodes.length} selected
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {workgroups.map((workgroup) => (
                    <label
                      key={workgroup.id}
                      className="flex items-start gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.workgroupCodes.includes(workgroup.ticket_code)}
                        onChange={() => toggleArrayValue("workgroupCodes", workgroup.ticket_code)}
                        className="mt-1 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {workgroup.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {workgroup.ticket_code}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Workflows</h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {form.workflowIds.length} selected
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {workflows.map((workflow) => (
                    <label
                      key={workflow.id}
                      className="flex items-start gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.workflowIds.includes(workflow.id)}
                        onChange={() => toggleArrayValue("workflowIds", workflow.id)}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {workflow.name}
                          </p>
                          <Badge variant={workflow.active ? "secondary" : "destructive"}>
                            {workflow.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={onClose} variant="outline" disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Saving..." : project ? "Save Project" : "Create Project"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
