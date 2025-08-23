import React from 'react';
import { Edit2, Save, X } from 'lucide-react';

const WorkgroupsTab = ({ workgroups, editingItem, editForm, handleEdit, handleSave, handleCancel, handleInputChange }) => {
  if (workgroups.length === 0) {
    return <div className="text-center py-8 text-gray-500">No workgroups found</div>;
  }

  return (
    <div className="grid gap-4">
      {workgroups.map(workgroup => (
        <div key={workgroup.id} className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">{workgroup.id}</span>
            </div>
            <div className="flex space-x-2">
              {editingItem === workgroup.id ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                    <Save size={16} />
                  </button>
                  <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => handleEdit(workgroup)} className="text-blue-600 hover:text-blue-800">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {editingItem === workgroup.id ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Workgroup name"
              />
              <textarea
                value={editForm.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Description"
                rows="3"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{workgroup.name}</h3>
              <p className="text-gray-600 text-sm">{workgroup.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkgroupsTab;