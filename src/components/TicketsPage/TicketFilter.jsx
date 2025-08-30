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
  const [workgroupMap, setWorkgroupMap] = useState({}); // id => name map

  const dropdownRefs = useRef({});

  // Fetch workgroups for name display
  useEffect(() => {
    fetch("http://localhost:8000/workgroups")
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(wg => map[wg.id] = wg.name);
        setWorkgroupMap(map);
      })
      .catch(err => console.error("Failed to fetch workgroups:", err));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && dropdownRefs.current[openDropdown] &&
          !dropdownRefs.current[openDropdown].contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Extract unique values from tickets for filter options
  const filterOptions = useMemo(() => {
    if (!tickets || tickets.length === 0) return {
      status: [], priority: [], workGroup: [], responsible: [], module: [], tags: []
    };

    return {
      status: [...new Set(tickets.map(t => t.status).filter(Boolean))],
      priority: [...new Set(tickets.map(t => t.priority).filter(Boolean))],
      workGroup: [...new Set(tickets.map(t => t.workgroupId).filter(Boolean))], // IDs
      responsible: [...new Set(tickets.map(t => t.responsible).filter(Boolean))],
      module: [...new Set(tickets.map(t => t.module).filter(Boolean))],
      tags: [...new Set(tickets.flatMap(t => t.tags || []).filter(Boolean))]
    };
  }, [tickets]);

  const isTicketOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date(); const due = new Date(dueDate);
    today.setHours(0,0,0,0); due.setHours(0,0,0,0);
    return due < today;
  };

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(ticket => {
      if (filters.status.length && !filters.status.includes(ticket.status)) return false;
      if (filters.priority.length && !filters.priority.includes(ticket.priority)) return false;
      if (filters.workGroup.length && !filters.workGroup.includes(ticket.workgroupId)) return false; // use workgroupId
      if (filters.responsible.length && !filters.responsible.includes(ticket.responsible)) return false;
      if (filters.module.length && !filters.module.includes(ticket.module)) return false;
      if (filters.tags.length && !filters.tags.some(tag => (ticket.tags || []).includes(tag))) return false;
      if (filters.showOverdue && !isTicketOverdue(ticket.dueDate)) return false;
      return true;
    });
  }, [tickets, filters]);

  useEffect(() => { onFilteredTicketsChange(filteredTickets); }, [filteredTickets, onFilteredTicketsChange]);

  const handleFilterChange = (category, value, checked) => {
    setFilters(prev => {
      if (category === 'showOverdue') return { ...prev, showOverdue: checked };
      const newFilters = { ...prev };
      if (checked) newFilters[category] = [...prev[category], value];
      else newFilters[category] = prev[category].filter(v => v !== value);
      return newFilters;
    });
  };

  const clearFilters = () => setFilters({
    status: [], priority: [], workGroup: [], responsible: [], module: [], tags: [], showOverdue: false
  });

  const hasActiveFilters = Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f);
  const getActiveFilterCount = () => Object.entries(filters).reduce((count,[k,v]) => count + (k==='showOverdue'&&v?1: Array.isArray(v)?v.length:0),0);

  const toggleDropdown = (category) => setOpenDropdown(openDropdown===category?null:category);

  const FilterDropdownButton = ({ category, title, options, isSpecial=false }) => {
    const hasSelection = isSpecial ? filters.showOverdue : filters[category].length>0;
    const isOpen = openDropdown===category;
    return (
      <div className="relative" ref={el => dropdownRefs.current[category] = el}>
        <button onClick={()=>toggleDropdown(category)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            hasSelection ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                         : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
          <span>{title}</span>
          {hasSelection && <Badge variant="destructive" className="text-xs min-w-5 h-5 p-0 flex items-center justify-center">{isSpecial?'1':filters[category].length}</Badge>}
          <span className={`transition-transform ${isOpen?'rotate-180':''}`}>▼</span>
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            <div className="p-2">
              {isSpecial ? (
                <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input type="checkbox" checked={filters.showOverdue} onChange={(e)=>handleFilterChange('showOverdue',null,e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"/>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show only overdue tickets</span>
                </label>
              ) : (
                options.map(option => (
                  <label key={option} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input type="checkbox" checked={filters[category].includes(option)}
                      onChange={(e)=>handleFilterChange(category,option,e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"/>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {category==='workGroup'?workgroupMap[option]||option:option} {/* Show name */}
                    </span>
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
      <div className="flex items-center gap-2 mb-4">
        <button onClick={()=>setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <SlidersHorizontal />
          {hasActiveFilters && <Badge variant="destructive" className="text-xs min-w-5 h-5 p-0 flex items-center justify-center">{getActiveFilterCount()}</Badge>}
        </button>
        {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline">Clear all filters</button>}
      </div>

      {isFilterOpen && (
        <Card className="bg-white mb-6">
          <CardHeader><CardTitle className="text-lg">Filter Tickets</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <FilterDropdownButton category="status" title="Status" options={filterOptions.status} />
              <FilterDropdownButton category="priority" title="Priority" options={filterOptions.priority} />
              <FilterDropdownButton category="workGroup" title="WorkGroup" options={filterOptions.workGroup} />
              <FilterDropdownButton category="responsible" title="Responsible" options={filterOptions.responsible} />
              <FilterDropdownButton category="module" title="Module" options={filterOptions.module} />
              <FilterDropdownButton category="tags" title="Tags" options={filterOptions.tags} />
              <FilterDropdownButton category="showOverdue" title="Due Status" options={[]} isSpecial={true} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TicketFilter;