import React from 'react';
import { X } from 'lucide-react';

const colorOptions = [
  '#EF4444', '#F97316', '#FACC15', '#22C55E', '#06B6D4', 
  '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#EC4899', 
  '#A3A3A3', '#10B981'
];

const CreateModal = ({
  activeTab,
  createForm,
  handleCreateInputChange,
  handleCreateSkillsChange,
  handleCreateSave,
  handleCreateCancel,
  workgroups,
  roles // Roles prop
}) => {

  const getTitle = () => {
    switch (activeTab) {
      case 'employees': return 'Add New Employee';
      case 'tags': return 'Add New Tag';
      case 'workgroups': return 'Add New Workgroup';
      case 'modules': return 'Add New Module';
      default: return 'Add New Item';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{getTitle()}</h3>
            <button onClick={handleCreateCancel} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {activeTab === 'employees' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
                  <input
                    type="text"
                    value={createForm.name || ''}
                    onChange={(e) => handleCreateInputChange('name', e.target.value)}
                    placeholder="Enter name"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email || ''}
                    onChange={(e) => handleCreateInputChange('email', e.target.value)}
                    placeholder="Enter email"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Workgroup</label>
                  <select
                    value={createForm.workgroupId || ''}
                    onChange={(e) => handleCreateInputChange('workgroupId', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  >
                    <option value="">Select Workgroup</option>
                    {workgroups && workgroups.map(wg => (
                      <option key={wg.id} value={wg.id}>{wg.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Role</label>
                  <select
                    value={createForm.roleId || 3}
                    onChange={(e) => handleCreateInputChange('roleId', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  >
                    <option value="">Select Role</option>
                    {roles && roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={createForm.active || false}
                    onChange={(e) => handleCreateInputChange('active', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-200">Active</label>
                </div>
              </>
            )}

            {activeTab === 'tags' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Label</label>
                  <input
                    type="text"
                    value={createForm.label || ''}
                    onChange={(e) => handleCreateInputChange('label', e.target.value)}
                    placeholder="Enter tag label"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Select Color</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleCreateInputChange('color', color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          createForm.color === color ? 'border-blue-500 scale-110' : 'border-gray-300'
                        } transition-transform`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'workgroups' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
                  <input
                    type="text"
                    value={createForm.name || ''}
                    onChange={(e) => handleCreateInputChange('name', e.target.value)}
                    placeholder="Enter workgroup name"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
                  <textarea
                    value={createForm.description || ''}
                    onChange={(e) => handleCreateInputChange('description', e.target.value)}
                    placeholder="Enter description"
                    rows="3"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  />
                </div>
              </>
            )}

            {activeTab === 'modules' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
                  <input
                    type="text"
                    value={createForm.name || ''}
                    onChange={(e) => handleCreateInputChange('name', e.target.value)}
                    placeholder="Enter module name"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
                  <textarea
                    value={createForm.description || ''}
                    onChange={(e) => handleCreateInputChange('description', e.target.value)}
                    placeholder="Enter module description"
                    rows="3"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCreateCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
