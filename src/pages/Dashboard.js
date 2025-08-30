import React, { useEffect, useState, useCallback } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import TicketPriorityChart from "../components/Dashboard/TicketPriorityChart";
import TicketStatusChart from "../components/Dashboard/TicketStatusChart";
import OpenTicketsPieChart from "../components/Dashboard/OpenTicketsPieChart";
import TicketModuleStackedChart from "../components/Dashboard/TicketModuleStackedChart";
import TicketsCreatedLineChart from "../components/Dashboard/TicketsCreatedLineChart";
import FilterBar from "../components/Dashboard/FilterBar";
import TotalPendingTickets from '../components/Dashboard/TotalPendingTickets';

const Dashboard = () => {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [filters, setFilters] = useState({
    selectedWorkGroups: [],
    selectedModules: [],
    selectedStatuses: [],
  });
  const [areFiltersVisible, setAreFiltersVisible] = useState(true);
  const [workgroupMap, setWorkgroupMap] = useState({});

  // Fetch workgroups
  useEffect(() => {
    fetch("http://localhost:8000/workgroups")
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(wg => {
          map[wg.id] = wg.name;
        });
        setWorkgroupMap(map);
      })
      .catch(err => console.error("Failed to fetch workgroups:", err));
  }, []);

  // Fetch tickets
  useEffect(() => {
    fetch("http://localhost:8000/tickets")
      .then(res => res.json())
      .then(data => {
        setAllTickets(data);
        setFilteredTickets(data);
      })
      .catch(err => console.error("Failed to fetch tickets:", err));
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Apply filters
  useEffect(() => {
    let currentFiltered = allTickets;

    // Filter by workgroupId
    if (filters.selectedWorkGroups.length > 0) {
      currentFiltered = currentFiltered.filter(ticket =>
        filters.selectedWorkGroups.includes(ticket.workgroupId)
      );
    }

    // Filter by module
    if (filters.selectedModules.length > 0) {
      currentFiltered = currentFiltered.filter(ticket =>
        filters.selectedModules.includes(ticket.module?.trim())
      );
    }

    // Filter by status
    if (filters.selectedStatuses.length > 0) {
      currentFiltered = currentFiltered.filter(ticket =>
        filters.selectedStatuses.includes(ticket.status?.trim())
      );
    }

    setFilteredTickets(currentFiltered);
  }, [allTickets, filters]);

  const toggleFilterVisibility = () => setAreFiltersVisible(prev => !prev);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleFilterVisibility}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {areFiltersVisible ? <SlidersHorizontal /> : <SlidersHorizontal /> }
        </button>
      </div>

      {areFiltersVisible && (
        <FilterBar
          onFilterChange={handleFilterChange}
          allTickets={allTickets}
          workgroupMap={workgroupMap} // pass workgroup map
        />
      )}

      {/* Section 1: Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <TotalPendingTickets tickets={filteredTickets} />
        <OpenTicketsPieChart tickets={filteredTickets} />
      </div>

      {/* Section 2: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TicketPriorityChart tickets={filteredTickets} />
        <TicketStatusChart tickets={filteredTickets} />
        <TicketModuleStackedChart tickets={filteredTickets} />
      </div>

      {/* Section 3: Line chart */}
      <div className="grid grid-cols-1 gap-6">
        <TicketsCreatedLineChart tickets={filteredTickets} />
      </div>
    </div>
  );
};

export default Dashboard;