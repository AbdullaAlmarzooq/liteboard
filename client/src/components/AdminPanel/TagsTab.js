import React from 'react';
import { Edit2, Save, Undo2, Trash2 } from 'lucide-react';

const colorOptions = [
  '#E57373', // soft red
  '#FF9F70', // soft orange
  '#FFD666', // soft yellow
  '#66D9A6', // soft green
  '#4FC3E0', // soft cyan
  '#6BA3FF', // soft blue
  '#8794F6', // soft indigo
  '#A78BFA', // soft violet
  '#E879D9', // soft fuchsia
  '#F48FB1', // soft pink
  '#B8B8B8', // soft gray
  '#5FD4A0'  // soft emerald
];

const normalizeProjectName = (tag, projects) => {
  const projectId = tag.project_id || tag.projectId || '';
  const matchingProject = projects.find((project) => project.id === projectId);

  return (
    tag.project_name ||
    tag.projectName ||
    matchingProject?.name ||
    'Unassigned Project'
  );
};

const TagsTab = ({
  tags,
  projects = [],
  editingItem,
  editForm,
  handleEdit,
  handleSave,
  handleCancel,
  handleInputChange,
  handleDelete
}) => {
  if (tags.length === 0) {
    return <div className="text-center py-8 text-gray-500">No tags found</div>;
  }

  const groupedTags = tags
    .map((tag) => ({
      ...tag,
      resolvedProjectName: normalizeProjectName(tag, projects),
    }))
    .sort((left, right) => {
      const projectComparison = left.resolvedProjectName.localeCompare(right.resolvedProjectName);
      if (projectComparison !== 0) return projectComparison;
      return (left.label || '').localeCompare(right.label || '');
    })
    .reduce((groups, tag) => {
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.projectName !== tag.resolvedProjectName) {
        groups.push({
          projectName: tag.resolvedProjectName,
          tags: [tag],
        });
      } else {
        lastGroup.tags.push(tag);
      }
      return groups;
    }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tag
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>

          {groupedTags.map((group) => (
            <tbody key={group.projectName}>
              <tr className="sticky top-0 z-10">
                <td
                  colSpan={2}
                  className="border-y border-gray-200 bg-gray-50 px-6 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400"
                >
                  {group.projectName}
                </td>
              </tr>

              {group.tags.map((tag) => {
                const isEditing = editingItem === tag.id;

                return (
                  <tr
                    key={tag.id}
                    className="border-b border-gray-100 align-top transition-colors hover:bg-gray-50/80 dark:border-gray-700/80 dark:hover:bg-gray-900/30"
                  >
                    <td className="px-6 py-2.5">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editForm.label || ''}
                            onChange={(e) => handleInputChange('label', e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            placeholder="Tag label"
                          />

                          <div className="flex flex-wrap gap-2">
                            {colorOptions.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleInputChange('color', color)}
                                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                                  editForm.color === color
                                    ? 'scale-110 border-gray-900 dark:border-white'
                                    : 'border-white dark:border-gray-700'
                                }`}
                                style={{ backgroundColor: color }}
                                aria-label={`Select ${color} for ${tag.label}`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium shadow-sm"
                            style={{
                              backgroundColor: tag.color || '#E5E7EB',
                              color: '#fff'
                            }}
                          >
                            {tag.label}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-2.5">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="inline-flex items-center justify-center rounded-md border border-green-200 bg-green-50 p-2 text-green-700 transition-colors hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/50"
                              title="Save tag"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-800/70"
                              title="Cancel edit"
                            >
                              <Undo2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(tag)}
                              className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                              title={`Edit ${tag.label}`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(tag)}
                              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                              title={`Delete ${tag.label}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
};

export default TagsTab;
