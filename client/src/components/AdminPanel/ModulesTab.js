import React from 'react';
import { Edit2, Save, X } from 'lucide-react';

const ModulesTab = ({ modules, editingItem, editForm, handleEdit, handleSave, handleCancel, handleInputChange }) => {
  if (modules.length === 0) {
    return <div className="text-center py-8 text-gray-500">No modules found</div>;
  }

  return (
    <div className="grid gap-4">
      {modules.map(module => (
        <div key={module.id} className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2" />
            <div className="flex space-x-2">
              {editingItem === module.id ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                    <Save size={16} />
                  </button>
                  <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => handleEdit(module)} className="text-blue-600 hover:text-blue-800">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {editingItem === module.id ? (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Module name"
              />
              <textarea
                value={editForm.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Module description"
                rows="3"
              />
            </div>
          ) : (
            <div className="mt-2">
              <h3 className="font-semibold text-lg">{module.name}</h3>
              <p className="text-gray-600 text-sm">{module.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ModulesTab;
