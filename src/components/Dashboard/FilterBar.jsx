import React, { useEffect, useState, useRef } from 'react';

const FilterBar = ({ onFilterChange, allTickets, workgroupMap }) => {
  const [selectedWorkGroups, setSelectedWorkGroups] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);

  const dropdownRefs = useRef({});

  // Build options
  const allWorkGroups = Object.entries(workgroupMap).map(([id, name]) => ({ id, name }));
  const allModules = [...new Set(allTickets.map(t => t.module?.trim()).filter(Boolean))].sort();
  const allStatuses = [...new Set(allTickets.map(t => t.status?.trim()).filter(Boolean))].sort();

  // Notify parent on selection change
  useEffect(() => {
    onFilterChange({ selectedWorkGroups, selectedModules, selectedStatuses });
  }, [selectedWorkGroups, selectedModules, selectedStatuses, onFilterChange]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown && dropdownRefs.current[openDropdown] &&
          !dropdownRefs.current[openDropdown].contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Handlers
  const handleWorkGroupChange = (e) => {
    const { value, checked } = e.target;
    setSelectedWorkGroups(prev =>
      checked ? [...prev, value] : prev.filter(id => id !== value)
    );
  };
  const handleModuleChange = (e) => {
    const { value, checked } = e.target;
    setSelectedModules(prev =>
      checked ? [...prev, value] : prev.filter(m => m !== value)
    );
  };
  const handleStatusChange = (e) => {
    const { value, checked } = e.target;
    setSelectedStatuses(prev =>
      checked ? [...prev, value] : prev.filter(s => s !== value)
    );
  };
  const toggleDropdown = (category) => setOpenDropdown(openDropdown === category ? null : category);
  const clearAllFilters = () => {
    setSelectedWorkGroups([]);
    setSelectedModules([]);
    setSelectedStatuses([]);
    setOpenDropdown(null);
  };

  // Reusable dropdown
  const FilterDropdownButton = ({ category, title, options, selectedValues, onChange }) => {
    const isOpen = openDropdown === category;
    const hasSelection = selectedValues.length > 0;

    return (
      <div className="relative" ref={el => dropdownRefs.current[category] = el}>
        <button
          onClick={() => toggleDropdown(category)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            hasSelection
              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <span>{title}</span>
          {hasSelection && <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500 text-white">{selectedValues.length}</span>}
          <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm z-50 max-h-60 overflow-y-auto">
            <div className="p-2">
              {options.length > 0 ? (
                options.map(option => (
                  <label
                    key={option.id ?? option} // Workgroups have id, modules/status are strings
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={option.id ?? option} // Workgroups use id, modules/status use string
                      checked={selectedValues.includes(option.id ?? option)}
                      onChange={onChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option.name ?? option}</span>
                  </label>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm p-2">No {title.toLowerCase()} available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const hasActiveFilters = selectedWorkGroups.length > 0 || selectedModules.length > 0 || selectedStatuses.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-4 justify-start items-start transition-colors duration-200">
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

      {hasActiveFilters && (
        <div className="flex-shrink-0 mt-4 md:mt-0 md:ml-auto">
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;