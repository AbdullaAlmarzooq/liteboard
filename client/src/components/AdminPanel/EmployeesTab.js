import React from 'react';
import { Edit2, Save, X } from 'lucide-react';

const EmployeesTab = ({
  employees,
  workgroups,
  roles,
  editingItem,
  editForm,
  handleEdit,
  handleSave,
  handleCancel,
  handleInputChange,
  isAdmin = true
}) => {
  if (!employees.length) 
    return <div className="text-center py-8 text-gray-500">No employees found</div>;

  const getRoleBadgeColor = (roleName) => {
    switch (roleName) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Editor': return 'bg-blue-100 text-blue-800';
      case 'Viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (roleId) => roles.find(r => r.id === roleId)?.name || '';
  const getWorkgroupName = (wgCode) => workgroups.find(w => w.id === wgCode)?.name || 'Unknown';

  return (
    <div className="grid gap-4">
      {employees.map(emp => (
        <div key={emp.id} className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">{emp.id}</span>
              {emp.active && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>
              )}
              {emp.roleId && (
                <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(emp.roleName)}`}>
                  {emp.roleName}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {editingItem === emp.id ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                    <Save size={16} />
                  </button>
                  <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {editingItem === emp.id ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Name"
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
              />
              
              {isAdmin && (
                <input
                  type="password"
                  value={editForm.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="New Password (leave blank to keep current)"
                  className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
                />
              )}

              <input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email"
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
              />

              {/* Workgroup Dropdown */}
              <select
                value={editForm.workgroup_code || ''}
                onChange={(e) => handleInputChange('workgroup_code', e.target.value)}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
              >
                <option value="">Select Workgroup</option>
                {workgroups.map(wg => (
                  <option key={wg.id} value={wg.id}>{wg.name}</option>
                ))}
              </select>

              {/* Role Dropdown */}
              <select
                value={editForm.role_id || 3}
                onChange={(e) => handleInputChange('role_id', parseInt(e.target.value))}
                className="w-full p-1 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>

              {/* Active Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editForm.active || false}
                  onChange={(e) => handleInputChange('active', e.target.checked ? 1 : 0)}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{emp.name}</h3>
              <p className="text-gray-600">{emp.email}</p>
              <p className="text-sm text-gray-500">Workgroup: {emp.workgroupName}</p>
              <p className="text-sm text-gray-500">Role: {emp.roleName}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EmployeesTab;
