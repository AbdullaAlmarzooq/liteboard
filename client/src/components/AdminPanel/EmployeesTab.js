import React from 'react';
import { Edit2, Save, X } from 'lucide-react';

const EmployeesTab = ({
  employees,
  workgroups,
  roles, // NEW: Roles prop
  editingItem,
  editForm,
  handleEdit,
  handleSave,
  handleCancel,
  handleInputChange
}) => {
  if (employees.length === 0) {
    return <div className="text-center py-8 text-gray-500">No employees found</div>;
  }

  // Helper function to get role badge color
  const getRoleBadgeColor = (roleName) => {
    switch (roleName) {
      case 'Admin':
        return 'bg-red-100 text-red-800';
      case 'Editor':
        return 'bg-blue-100 text-blue-800';
      case 'Viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid gap-4">
      {employees.map(employee => (
        <div
          key={employee.id}
          className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">{employee.id}</span>
              {employee.active && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Active
                </span>
              )}
              {/* NEW: Role Badge */}
              {employee.roleName && (
                <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(employee.roleName)}`}>
                  {employee.roleName}
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              {editingItem === employee.id ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                    <Save size={16} />
                  </button>
                  <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">
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
              <select
                value={editForm.workgroup_code || editForm.workgroupId || ''}
                onChange={(e) => handleInputChange('workgroup_code', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
              >
                <option value="">Select Workgroup</option>
                {workgroups.map(wg => (
                  <option key={wg.id} value={wg.id}>
                    {wg.name}
                  </option>
                ))}
              </select>
              {/* NEW: Role Dropdown */}
              <select
                value={editForm.role_id || editForm.roleId || 3}
                onChange={(e) => handleInputChange('role_id', parseInt(e.target.value))}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
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
              <p className="text-sm text-gray-500">
                Workgroup: {employee.workgroupName || 'Unknown'}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EmployeesTab;