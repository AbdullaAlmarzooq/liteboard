import React, { useEffect, useState, useCallback } from 'react';
import TicketPriorityChart from "../components/TicketPriorityChart";
import TicketStatusChart from "../components/TicketStatusChart";
import OpenTicketsPieChart from "../components/OpenTicketsPieChart";
import InProgressTicketsPieChart from "../components/InProgressTicketsPieChart";
import TicketModuleStackedChart from "../components/TicketModuleStackedChart";
import TicketsCreatedLineChart from "../components/TicketsCreatedLineChart";
import FilterBar from "../components/FilterBar";
import TotalOpenTickets from '../components/TotalOpenTickets';
import TotalPendingTickets from '../components/TotalPendingTickets';

const Dashboard = () => {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [filters, setFilters] = useState({
    selectedWorkGroups: [],
    selectedModules: [],
    selectedStatuses: [],
  });
  const [areFiltersVisible, setAreFiltersVisible] = useState(true);


  useEffect(() => {
    fetch("http://localhost:8000/tickets")
      .then(res => res.json())
      .then(data => {
        setAllTickets(data);
        setFilteredTickets(data); 
      })
      .catch(err => {
        console.error("Failed to fetch tickets:", err);
      });
  }, []);


  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);


  useEffect(() => {
    let currentFiltered = allTickets;

    if (filters.selectedWorkGroups.length > 0) {
      currentFiltered = currentFiltered.filter(ticket =>
        filters.selectedWorkGroups.includes(ticket.workGroup?.trim())
      );
    }

    if (filters.selectedModules.length > 0) {
      currentFiltered = currentFiltered.filter(ticket =>
        filters.selectedModules.includes(ticket.module?.trim())
      );
    }

  
    if (filters.selectedStatuses.length > 0) {
      currentFiltered = currentFiltered.filter(ticket =>
        filters.selectedStatuses.includes(ticket.status?.trim())
      );
    }

    setFilteredTickets(currentFiltered);
  }, [allTickets, filters]);


  const toggleFilterVisibility = () => {
    setAreFiltersVisible(prev => !prev);
  };

return (
  <div className="p-8 space-y-8">
    <div className="flex justify-end mb-4">
      <button
        onClick={toggleFilterVisibility}
        className="px-6 py-2 rounded-md bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75
                   dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:ring-blue-600 transition-colors duration-200"
      >
        {areFiltersVisible ? "Hide Filters" : "Show Filters"}
      </button>
    </div>


    {areFiltersVisible && (
      <FilterBar onFilterChange={handleFilterChange} allTickets={allTickets} />
    )}

    {/* Section 1: All four summary components in one line */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <TotalOpenTickets tickets={filteredTickets} />
      <TotalPendingTickets tickets={filteredTickets} />
      <OpenTicketsPieChart tickets={filteredTickets} />
      <InProgressTicketsPieChart tickets={filteredTickets} />
    </div>

    {/* Section 2: Three charts in one line */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <TicketPriorityChart tickets={filteredTickets} />
      <TicketStatusChart tickets={filteredTickets} />
      <TicketModuleStackedChart tickets={filteredTickets} />
    </div>

    {/* Section 3: One chart in one line */}
    <div className="grid grid-cols-1 gap-6">
      <TicketsCreatedLineChart tickets={filteredTickets} />
    </div>
  </div>
);
};

export default Dashboard;