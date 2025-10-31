import React, { useState, useEffect } from "react";
import { HiAdjustmentsHorizontal } from "react-icons/hi2";
import FilterBar from "../components/Dashboard/FilterBar";
import TotalPendingTickets from "../components/Dashboard/TotalPendingTickets";
import OpenTicketsPieChart from "../components/Dashboard/PendingTicketsPieChart";
import TicketPriorityChart from "../components/Dashboard/TicketPriorityChart";
import TicketStatusChart from "../components/Dashboard/TicketStatusChart";
import TicketModuleStackedChart from "../components/Dashboard/TicketModuleStackedChart";
import TicketsCreatedLineChart from "../components/Dashboard/TicketsCreatedLineChart";

const Dashboard = () => {
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [workgroups, setWorkgroups] = useState([]);
  const [areFiltersVisible, setAreFiltersVisible] = useState(true);

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/tickets");
        const data = await res.json();
        setAllTickets(data || []);
        setFilteredTickets(data || []);
      } catch (err) {
        console.error("Failed to fetch tickets:", err);
      }
    };
    fetchTickets();
  }, []);

  // Fetch workgroups
  useEffect(() => {
    const fetchWorkgroups = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/workgroups");
        const data = await res.json();
        setWorkgroups(data || []);
      } catch (err) {
        console.error("Failed to fetch workgroups:", err);
      }
    };
    fetchWorkgroups();
  }, []);

  const toggleFilterVisibility = () => setAreFiltersVisible(prev => !prev);

  // Stable handleFilterChange
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

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleFilterVisibility}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <HiAdjustmentsHorizontal className="w-5 h-5" />
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