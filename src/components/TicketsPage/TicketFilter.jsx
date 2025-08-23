import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../Card";
import Badge from "../Badge";
import { SlidersHorizontal } from 'lucide-react';


const TicketFilter = ({ tickets, onFilteredTicketsChange, className = "" }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    workGroup: [],
    responsible: [],
    module: [],
    tags: [],
    showOverdue: false
  });

  const dropdownRefs = useRef({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && dropdownRefs.current[openDropdown] && 
          !dropdownRefs.current[openDropdown].contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Extract unique values from tickets for filter options
  const filterOptions = useMemo(() => {
    if (!tickets || tickets.length === 0) {
      return {
        status: [],
        priority: [],
        workGroup: [],
        responsible: [],
        module: [],
        tags: []
      };
    }

    const uniqueValues = {
      status: [...new Set(tickets.map(ticket => ticket.status).filter(Boolean))],
      priority: [...new Set(tickets.map(ticket => ticket.priority).filter(Boolean))],
      workGroup: [...new Set(tickets.map(ticket => ticket.workGroup).filter(Boolean))],
      responsible: [...new Set(tickets.map(ticket => ticket.responsible).filter(Boolean))],
      module: [...new Set(tickets.map(ticket => ticket.module).filter(Boolean))],
      tags: [...new Set(tickets.flatMap(ticket => ticket.tags || []).filter(Boolean))]
    };

    return uniqueValues;
  }, [tickets]);

  // Check if a ticket is overdue
  const isTicketOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Filter tickets based on current filters
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    return tickets.filter(ticket => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(ticket.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(ticket.priority)) {
        return false;
      }

      // Work Group filter
      if (filters.workGroup.length > 0 && !filters.workGroup.includes(ticket.workGroup)) {
        return false;
      }

      // Responsible filter
      if (filters.responsible.length > 0 && !filters.responsible.includes(ticket.responsible)) {
        return false;
      }

      // Module filter
      if (filters.module.length > 0 && !filters.module.includes(ticket.module)) {
        return false;
      }

      // Tags filter (ticket must have at least one of the selected tags)
      if (filters.tags.length > 0) {
        const ticketTags = ticket.tags || [];
        const hasMatchingTag = filters.tags.some(tag => ticketTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Overdue filter
      if (filters.showOverdue && !isTicketOverdue(ticket.dueDate)) {
        return false;
      }

      return true;
    });
  }, [tickets, filters]);

  // Update filtered tickets when filters change
  React.useEffect(() => {
    onFilteredTicketsChange(filteredTickets);
  }, [filteredTickets, onFilteredTicketsChange]);

  const handleFilterChange = (category, value, checked) => {
    setFilters(prev => {
      if (category === 'showOverdue') {
        return { ...prev, showOverdue: checked };
      }

      const newFilters = { ...prev };
      if (checked) {
        newFilters[category] = [...prev[category], value];
      } else {
        newFilters[category] = prev[category].filter(item => item !== value);
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      workGroup: [],
      responsible: [],
      module: [],
      tags: [],
      showOverdue: false
    });
  };

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter
  );

  const getActiveFilterCount = () => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'showOverdue' && value) count++;
      else if (Array.isArray(value)) count += value.length;
    });
    return count;
  };

  const toggleDropdown = (category) => {
    setOpenDropdown(openDropdown === category ? null : category);
  };

  const getFilterButtonVariant = (category) => {
    const hasSelection = Array.isArray(filters[category]) ? filters[category].length > 0 : filters[category];
    return hasSelection ? "secondary" : "outline";
  };

  const FilterDropdownButton = ({ category, title, options, isSpecial = false }) => {
    const hasSelection = isSpecial ? filters.showOverdue : filters[category].length > 0;
    const isOpen = openDropdown === category;

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
          {hasSelection && (
            <Badge variant="destructive" className="text-xs min-w-5 h-5 p-0 flex items-center justify-center">
              {isSpecial ? '1' : filters[category].length}
            </Badge>
          )}
          <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            <div className="p-2">
              {isSpecial ? (
                <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showOverdue}
                    onChange={(e) => handleFilterChange('showOverdue', null, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show only overdue tickets</span>
                </label>
              ) : (
                options.map(option => (
                  <label
                    key={option}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters[category].includes(option)}
                      onChange={(e) => handleFilterChange(category, option, e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span><SlidersHorizontal/></span>
          {hasActiveFilters && (
            <Badge variant="destructive" className="text-xs min-w-5 h-5 p-0 flex items-center justify-center">
              {getActiveFilterCount()}
            </Badge>
          )}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <Card className="bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filter Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <FilterDropdownButton
                category="status"
                title="Status"
                options={filterOptions.status}
              />
              
              <FilterDropdownButton
                category="priority"
                title="Priority"
                options={filterOptions.priority}
              />
              
              <FilterDropdownButton
                category="workGroup"
                title="Work Group"
                options={filterOptions.workGroup}
              />
              
              <FilterDropdownButton
                category="responsible"
                title="Responsible"
                options={filterOptions.responsible}
              />
              
              <FilterDropdownButton
                category="module"
                title="Module"
                options={filterOptions.module}
              />
              
              <FilterDropdownButton
                category="tags"
                title="Tags"
                options={filterOptions.tags}
              />

              <FilterDropdownButton
                category="showOverdue"
                title="Due Status"
                options={[]}
                isSpecial={true}
              />
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Active Filters:</h5>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(filters).map(([category, values]) => {
                    if (category === 'showOverdue' && values) {
                      return (
                        <Badge key={category} variant="secondary" className="text-xs">
                          Overdue tickets
                        </Badge>
                      );
                    }
                    if (Array.isArray(values) && values.length > 0) {
                      return values.map(value => (
                        <Badge key={`${category}-${value}`} variant="secondary" className="text-xs">
                          {category}: {value}
                        </Badge>
                      ));
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TicketFilter;