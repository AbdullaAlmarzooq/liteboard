import React from 'react';
import { Edit2, Save, X, Trash2 } from 'lucide-react';

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

const TagsTab = ({
  tags,
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

  return (
    <div className="grid gap-4">
      {tags.map(tag => (
        <div
          key={tag.id}
          className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
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
                <>
                  <button onClick={() => handleEdit(tag)} className="text-blue-600 hover:text-blue-800">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(tag.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {editingItem === tag.id ? (
            <div className="mt-3 space-y-3">
              {/* Tag Label */}
              <input
                type="text"
                value={editForm.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Tag label"
              />

              {/* Color Picker */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">
                  Select Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        editForm.color === color
                          ? 'border-blue-500 scale-110'
                          : 'border-gray-300'
                      } transition-transform`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: tag.color || '#E5E7EB',
                  color: '#fff'
                }}
              >
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
