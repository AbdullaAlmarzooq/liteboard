// components/FilterBar.jsx
import React, { useEffect, useState } from 'react';

const FilterBar = ({ onFilterChange, allTickets }) => {
  const [selectedWorkGroups, setSelectedWorkGroups] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]); // New state for statuses

  // Extract unique work groups, modules, and statuses from allTickets
  const allWorkGroups = [...new Set(allTickets.map(ticket => ticket.workGroup?.trim()).filter(Boolean))].sort();
  const allModules = [...new Set(allTickets.map(ticket => ticket.module?.trim()).filter(Boolean))].sort();
  // New: Extract unique statuses
  const allStatuses = [...new Set(allTickets.map(ticket => ticket.status?.trim()).filter(Boolean))].sort();

  useEffect(() => {
    // Call the parent's onFilterChange when selections change
    onFilterChange({ selectedWorkGroups, selectedModules, selectedStatuses }); // Include selectedStatuses
  }, [selectedWorkGroups, selectedModules, selectedStatuses, onFilterChange]);

  const handleWorkGroupChange = (e) => {
    const { value, checked } = e.target;
    setSelectedWorkGroups(prev =>
      checked ? [...prev, value] : prev.filter(group => group !== value)
    );
  };

  const handleModuleChange = (e) => {
    const { value, checked } = e.target;
    setSelectedModules(prev =>
      checked ? [...prev, value] : prev.filter(module => module !== value)
    );
  };

  // New: Handler for status checkboxes
  const handleStatusChange = (e) => {
    const { value, checked } = e.target;
    setSelectedStatuses(prev =>
      checked ? [...prev, value] : prev.filter(status => status !== value)
    );
  };

  return (
    <div className="rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row gap-6 justify-around items-start bg-white dark:bg-gray-800 transition-colors duration-200">
      <div className="flex-1 w-full md:w-auto">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Work Group:
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
          {allWorkGroups.length > 0 ? (
            allWorkGroups.map(group => (
              <div key={group} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`wg-${group}`}
                  value={group}
                  checked={selectedWorkGroups.includes(group)}
                  onChange={handleWorkGroupChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:checked:bg-blue-600"
                />
                <label htmlFor={`wg-${group}`} className="ml-2 text-gray-900 dark:text-gray-100 text-sm cursor-pointer">
                  {group}
                </label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No work groups available.</p>
          )}
        </div>
      </div>

      <div className="flex-1 w-full md:w-auto">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Module:
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
          {allModules.length > 0 ? (
            allModules.map(module => (
              <div key={module} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`mod-${module}`}
                  value={module}
                  checked={selectedModules.includes(module)}
                  onChange={handleModuleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:checked:bg-blue-600"
                />
                <label htmlFor={`mod-${module}`} className="ml-2 text-gray-900 dark:text-gray-100 text-sm cursor-pointer">
                  {module}
                </label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No modules available.</p>
          )}
        </div>
      </div>

      {/* New: Filter by Status */}
      <div className="flex-1 w-full md:w-auto">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Status:
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
          {allStatuses.length > 0 ? (
            allStatuses.map(status => (
              <div key={status} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`status-${status}`}
                  value={status}
                  checked={selectedStatuses.includes(status)}
                  onChange={handleStatusChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:checked:bg-blue-600"
                />
                <label htmlFor={`status-${status}`} className="ml-2 text-gray-900 dark:text-gray-100 text-sm cursor-pointer">
                  {status}
                </label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No statuses available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;