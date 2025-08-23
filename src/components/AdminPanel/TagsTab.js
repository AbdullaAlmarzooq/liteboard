import React from 'react';
import { Edit2, Save, X } from 'lucide-react';

const TagsTab = ({ tags, editingItem, editForm, handleEdit, handleSave, handleCancel, handleInputChange }) => {
  if (tags.length === 0) {
    return <div className="text-center py-8 text-gray-500">No tags found</div>;
  }

  return (
    <div className="grid gap-4">
      {tags.map(tag => (
        <div key={tag.id} className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">{tag.id}</span>
            </div>
            <div className="flex space-x-2">
              {editingItem === tag.id ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                    <Save size={16} />
                  </button>
                  <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => handleEdit(tag)} className="text-blue-600 hover:text-blue-800">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {editingItem === tag.id ? (
            <div className="mt-3">
              <input
                type="text"
                value={editForm.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Tag label"
              />
            </div>
          ) : (
            <div className="mt-2">
              <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm ">
                {tag.label}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TagsTab;