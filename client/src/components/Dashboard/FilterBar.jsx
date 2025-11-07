import React, { useState, useRef, useEffect } from 'react';
import Badge from '../Badge';

const FilterBar = ({ onFilterChange, allTickets, workgroups = [] }) => {
  // --- FIX: Safely ensure 'tickets' is an array before attempting .filter() ---
  const tickets = Array.isArray(allTickets) ? allTickets : [];

  const [selectedWorkGroups, setSelectedWorkGroups] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);

  const dropdownRefs = useRef({});

  // Toggle dropdown open/close
  const toggleDropdown = (category) => {
    setOpenDropdown(openDropdown === category ? null : category);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        openDropdown &&
        dropdownRefs.current[openDropdown] &&
        !dropdownRefs.current[openDropdown].contains(e.target)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Handlers for selection
  const handleWorkGroupChange = (e) => {
    const { value, checked } = e.target;
    const newSelection = checked
      ? [...selectedWorkGroups, value]
      : selectedWorkGroups.filter((id) => id !== value);
    setSelectedWorkGroups(newSelection);
    onFilterChange({ selectedWorkGroups: newSelection, selectedModules, selectedStatuses });
  };

  const handleModuleChange = (e) => {
    const { value, checked } = e.target;
    const newSelection = checked
      ? [...selectedModules, value]
      : selectedModules.filter((m) => m !== value);
    setSelectedModules(newSelection);
    onFilterChange({ selectedWorkGroups, selectedModules: newSelection, selectedStatuses });
  };

  const handleStatusChange = (e) => {
    const { value, checked } = e.target;
    const newSelection = checked
      ? [...selectedStatuses, value]
      : selectedStatuses.filter((s) => s !== value);
    setSelectedStatuses(newSelection);
    onFilterChange({ selectedWorkGroups, selectedModules, selectedStatuses: newSelection });
  };

  const clearAllFilters = () => {
    setSelectedWorkGroups([]);
    setSelectedModules([]);
    setSelectedStatuses([]);
    onFilterChange({ selectedWorkGroups: [], selectedModules: [], selectedStatuses: [] });
  };

  // Compute narrowed lists
  // Workgroups = provided list
  const allWorkGroups = workgroups;

  // Modules depend only on workgroup
  // Note: Using the sanitized 'tickets' array now
  const modulesTickets = tickets.filter(
    (t) => !selectedWorkGroups.length || selectedWorkGroups.includes(t.workgroupId)
  );
  const allModules = [...new Set(modulesTickets.map((t) => t.module_name).filter(Boolean))].sort();

  // Statuses depend on workgroup + module
  // Note: Using the sanitized 'tickets' array now
  const statusesTickets = tickets.filter(
    (t) =>
      (!selectedWorkGroups.length || selectedWorkGroups.includes(t.workgroupId)) &&
      (!selectedModules.length || selectedModules.includes(t.module_name))
  );
  const allStatuses = [...new Set(statusesTickets.map((t) => t.status).filter(Boolean))].sort();

  // Final filtered tickets (all 3 filters applied)
  // Note: Using the sanitized 'tickets' array now
  const filteredTickets = tickets.filter(
    (t) =>
      (!selectedWorkGroups.length || selectedWorkGroups.includes(t.workgroupId)) &&
      (!selectedModules.length || selectedModules.includes(t.module_name)) &&
      (!selectedStatuses.length || selectedStatuses.includes(t.status))
  );

  // Reusable dropdown component
  const FilterDropdownButton = ({ category, title, options, selectedValues, onChange }) => {
    const isOpen = openDropdown === category;
    const hasSelection = selectedValues.length > 0;

    return (
      <div className="relative" ref={(el) => (dropdownRefs.current[category] = el)}>
        <button
          onClick={() => toggleDropdown(category)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            hasSelection
              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <span>{title}</span>
          {hasSelection && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {selectedValues.length}
            </span>
          )}
          <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm z-50 max-h-60 overflow-y-auto">
            <div className="p-2">
              {options.length > 0 ? (
                options.map((option) => (
                  <label
                    key={option.id ?? option}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={option.id ?? option}
                      checked={selectedValues.includes(option.id ?? option)}
                      onChange={onChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {option.name ?? option}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm p-2">
                  No {title.toLowerCase()} available.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getWorkGroupName = (id) => {
    const group = workgroups.find(group => group.id === id);
    return group ? group.name : id;
  };

  // Helper array to combine all active filters into a display list
  const activeFilters = [
    ...selectedWorkGroups.map(id => ({ // Changed 'value' to 'id' for clarity
      category: 'WorkGroup',
      // **********************************************
      // NEW: Use the helper to get the NAME for the badge value
      value: getWorkGroupName(id),
      // **********************************************
      // The remove function must still pass the ID back to the handler for state update
      remove: () => handleWorkGroupChange({ target: { value: id, checked: false } })
    })),
    ...selectedModules.map(value => ({
      category: 'Module',
      value,
      remove: () => handleModuleChange({ target: { value, checked: false } })
    })),
    ...selectedStatuses.map(value => ({
      category: 'Status',
      value,
      remove: () => handleStatusChange({ target: { value, checked: false } })
    })),
  ];


  const hasActiveFilters =
    selectedWorkGroups.length > 0 || selectedModules.length > 0 || selectedStatuses.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8 flex flex-col gap-4 justify-start transition-colors duration-200">
      {/* Filter Dropdowns Section */}
      <div className="flex flex-wrap gap-3">
        <FilterDropdownButton
          category="workGroup"
          title="WorkGroup"
          options={allWorkGroups}
          selectedValues={selectedWorkGroups}
          onChange={handleWorkGroupChange}
        />
        <FilterDropdownButton
          category="module"
          title="Module"
          options={allModules}
          selectedValues={selectedModules}
          onChange={handleModuleChange}
        />
        <FilterDropdownButton
          category="status"
          title="Status"
          options={allStatuses}
          selectedValues={selectedStatuses}
          onChange={handleStatusChange}
        />
      </div>

      {/* Active Filters and Clear Button Section */}
      {hasActiveFilters && (
        <div className="flex flex-wrap justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge
                key={`${filter.category}-${filter.value}`}
                variant="outline"
                className="text-xs flex items-center space-x-1"
              >
                <span className="font-semibold">{filter.category}:</span>
                <span>{filter.value}</span>
                <button
                  onClick={filter.remove}
                  className="ml-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label={`Remove ${filter.category}: ${filter.value} filter`}
                >
                  &times;
                </button>
              </Badge>
            ))}
          </div>

          {/* Clear all filters button, now positioned on the right of the badges */}
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline flex-shrink-0 mt-2 md:mt-0"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;