import React from 'react';
import { Edit2 } from 'lucide-react';

const EmployeesTab = ({
  employees,
  workgroups,
  roles,
  handleEdit,
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

  return (
    <div className="grid gap-4">
      {employees.map(emp => (
        <div key={emp.id} className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  emp.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {emp.active ? 'Active' : 'Inactive'}
              </span>
              {emp.roleId && (
                <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(emp.roleName)}`}>
                  {emp.roleName}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800">
                <Edit2 size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{emp.name}</h3>
            <p className="text-gray-600">{emp.email}</p>
            <p className="text-sm text-gray-500">Workgroup: {emp.workgroupName}</p>
            <p className="text-sm text-gray-500">Role: {emp.roleName}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmployeesTab;
