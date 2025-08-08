import React from 'react';
import { Edit2, Save, X } from 'lucide-react';

const EmployeesTab = ({ employees, editingItem, editForm, handleEdit, handleSave, handleCancel, handleInputChange, handleSkillsChange }) => {
  if (employees.length === 0) {
    return <div className="text-center py-8 text-gray-500">No employees found</div>;
  }

  return (
    <div className="grid gap-4">
      {employees.map(employee => (
        <div key={employee.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">{employee.id}</span>
              {employee.active && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>}
            </div>
            <div className="flex space-x-2">
              {editingItem === employee.id ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                    <Save size={16} />
                  </button>
                  <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => handleEdit(employee)} className="text-blue-600 hover:text-blue-800">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {editingItem === employee.id ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Name"
              />
              <input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Email"
              />
              <input
                type="text"
                value={editForm.position || ''}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Position"
              />
              <input
                type="text"
                value={editForm.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Department"
              />
              <input
                type="text"
                value={editForm.workgroup || ''}
                onChange={(e) => handleInputChange('workgroup', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Workgroup"
              />
              <input
                type="text"
                value={editForm.skills ? editForm.skills.join(', ') : ''}
                onChange={(e) => handleSkillsChange(e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                placeholder="Skills (comma separated)"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editForm.active || false}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{employee.name}</h3>
              <p className="text-gray-600">{employee.email}</p>
              <p className="text-sm text-gray-500">{employee.position}</p>
              <p className="text-sm text-gray-500">{employee.department} - {employee.workgroup}</p>
              <p className="text-xs text-gray-400">Joined: {employee.joined_date}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EmployeesTab;