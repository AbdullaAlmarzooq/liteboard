import React, { useState, useEffect } from "react";
import { SlidersHorizontal } from 'lucide-react';
// 🚩 FIX: Reverting to the most common React structure:
// Dashboard.jsx (in /pages) -> needs to go UP one level (..) 
// -> then DOWN into 'components'
import useFetch from "../useFetch"; // Still keeping this as ../useFetch, as it's the most logical path
import FilterBar from "../components/Dashboard/FilterBar"; 
import TotalPendingTickets from "../components/Dashboard/TotalPendingTickets";
import OpenTicketsPieChart from "../components/Dashboard/PendingTicketsPieChart";
import TicketPriorityChart from "../components/Dashboard/TicketPriorityChart";
import TicketStatusChart from "../components/Dashboard/TicketStatusChart";
import TicketModuleStackedChart from "../components/Dashboard/TicketModuleStackedChart";
import TicketsCreatedLineChart from "../components/Dashboard/TicketsCreatedLineChart";

const Dashboard = () => {
  // Local state for filtered tickets
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [workgroups, setWorkgroups] = useState([]);
  const [areFiltersVisible, setAreFiltersVisible] = useState(true);

  // 1. Fetch tickets using the authenticated hook
  const { 
    data: ticketsData, 
    isPending: ticketsPending, 
    error: ticketsError 
  } = useFetch("http://localhost:8000/api/tickets");

  // 2. Fetch workgroups using the authenticated hook
  const { 
    data: workgroupsData, 
    isPending: workgroupsPending, 
    error: workgroupsError 
  } = useFetch("http://localhost:8000/api/workgroups");


  // Effect to synchronize fetched ticket data with local state for filtering
  useEffect(() => {
    if (ticketsData) {
      setAllTickets(ticketsData);
      setFilteredTickets(ticketsData);
    }
  }, [ticketsData]);

  // Effect to synchronize fetched workgroup data with local state
  useEffect(() => {
    if (workgroupsData) {
      setWorkgroups(workgroupsData);
    }
  }, [workgroupsData]);

  const toggleFilterVisibility = () => setAreFiltersVisible(prev => !prev);

  // Stable handleFilterChange (unchanged)
  const handleFilterChange = ({ selectedWorkGroups, selectedModules, selectedStatuses }) => {
    let filtered = [...allTickets];

    if (selectedWorkGroups?.length) {
      filtered = filtered.filter(ticket => selectedWorkGroups.includes(ticket.workgroupId));
    }

    if (selectedModules?.length) {
      filtered = filtered.filter(ticket => selectedModules.includes(ticket.module_name));
    }

    if (selectedStatuses?.length) {
      filtered = filtered.filter(ticket => selectedStatuses.includes(ticket.status));
    }

    setFilteredTickets(filtered);
  };

  // 3. Handle Loading and Error States
  if (ticketsPending || workgroupsPending) {
    return <p className="p-8 text-center text-lg text-blue-600 dark:text-blue-400">Loading Dashboard data...</p>;
  }

  // Combine errors for display
  const error = ticketsError || workgroupsError;
  if (error) {
    return (
        <div className="p-8 text-center bg-red-100 border border-red-400 text-red-700 rounded-lg mx-auto max-w-lg mt-10">
            <h2 className="text-xl font-bold mb-2">Data Loading Error</h2>
            <p className="text-sm">{error.toString()}</p>
            <p className="text-xs mt-2">Check the console for specific authentication failures.</p>
        </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-start mb-4">
        <button
          onClick={toggleFilterVisibility}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
        >
          <SlidersHorizontal className="w-5 h-5" />
          {areFiltersVisible ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {areFiltersVisible && (
        <FilterBar
          onFilterChange={handleFilterChange}
          allTickets={allTickets}
          workgroups={workgroups}
        />
      )}

      {/* Section 1: Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <TotalPendingTickets tickets={filteredTickets} />
        <OpenTicketsPieChart tickets={filteredTickets} workgroups={workgroups}/>
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