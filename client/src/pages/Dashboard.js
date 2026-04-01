import React, { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal } from 'lucide-react';
import useFetch from "../useFetch";
import FilterBar from "../components/Dashboard/FilterBar";
import TotalPendingTickets from "../components/Dashboard/TotalPendingTickets";
import PendingTicketsPerTypeChart from "../components/Dashboard/PendingTicketsPerTypeChart";
import OpenTicketsPieChart from "../components/Dashboard/PendingTicketsPieChart";
import TicketPriorityChart from "../components/Dashboard/TicketPriorityChart";
import TicketStatusChart from "../components/Dashboard/TicketStatusChart";
import TicketModuleStackedChart from "../components/Dashboard/TicketModuleStackedChart";
import TicketsCreatedLineChart from "../components/Dashboard/TicketsCreatedLineChart";
import { useAuth } from "../components/hooks/useAuth";

const Dashboard = () => {
  const { user } = useAuth();
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [workgroups, setWorkgroups] = useState([]);
  const [areFiltersVisible, setAreFiltersVisible] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const { 
    data: ticketsData, 
    isPending: ticketsPending, 
    error: ticketsError 
  } = useFetch("http://localhost:8000/api/tickets");

  const { 
    data: workgroupsData, 
    isPending: workgroupsPending, 
    error: workgroupsError 
  } = useFetch("http://localhost:8000/api/workgroups");

  const {
    data: projectsData,
    isPending: projectsPending,
    error: projectsError
  } = useFetch("http://localhost:8000/api/projects");

  useEffect(() => {
    if (ticketsData) {
      setAllTickets(ticketsData);
    }
  }, [ticketsData]);

  useEffect(() => {
    if (workgroupsData) {
      setWorkgroups(workgroupsData);
    }
  }, [workgroupsData]);

  const projects = useMemo(
    () => (Array.isArray(projectsData) ? projectsData : []),
    [projectsData]
  );

  const projectScopedTickets = useMemo(() => {
    if (!selectedProjectId) return allTickets;

    return allTickets.filter(
      (ticket) => (ticket.project_id || ticket.projectId || "") === selectedProjectId
    );
  }, [allTickets, selectedProjectId]);

  const visibleWorkgroups = useMemo(() => {
    if (!projectScopedTickets.length) {
      return workgroups;
    }

    const workgroupIds = new Set(
      projectScopedTickets
        .map((ticket) => ticket.workgroup_id || ticket.workgroupId)
        .filter(Boolean)
    );

    return workgroups.filter((workgroup) => workgroupIds.has(workgroup.id));
  }, [projectScopedTickets, workgroups]);

  useEffect(() => {
    setFilteredTickets(projectScopedTickets);
  }, [projectScopedTickets]);

  const toggleFilterVisibility = () => setAreFiltersVisible(prev => !prev);

  const handleFilterChange = ({
    selectedWorkGroups,
    selectedModules,
    selectedWorkflows,
    selectedStatuses
  }) => {
    let filtered = [...projectScopedTickets];
    const getTicketStepName = (ticket) => ticket.current_step_name || ticket.currentStepName || ticket.status;

    if (selectedWorkGroups?.length) {
      filtered = filtered.filter(ticket =>
        selectedWorkGroups.includes(ticket.workgroupId || ticket.workgroup_id)
      );
    }

    if (selectedModules?.length) {
      filtered = filtered.filter(ticket =>
        selectedModules.includes(ticket.module_name || ticket.module)
      );
    }

    if (selectedWorkflows?.length) {
      filtered = filtered.filter(ticket =>
        selectedWorkflows.includes(ticket.workflow_name || ticket.workflowName)
      );
    }

    if (selectedStatuses?.length) {
      filtered = filtered.filter(ticket => selectedStatuses.includes(getTicketStepName(ticket)));
    }

    setFilteredTickets(filtered);
  };

  if (ticketsPending || workgroupsPending || projectsPending) {
    return <p className="p-8 text-center text-lg text-blue-600 dark:text-blue-400">Loading Dashboard data...</p>;
  }

  const error = ticketsError || workgroupsError || projectsError;
  if (error) {
    return (
        <div className="p-8 text-center bg-red-100 border border-red-400 text-red-700 rounded-lg mx-auto max-w-lg mt-10">
            <h2 className="text-xl font-bold mb-2">Data Loading Error</h2>
            <p className="text-sm">{error.toString()}</p>
            <p className="text-xs mt-2">Check the console for specific authentication failures.</p>
        </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="p-8 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {user?.role_id === 1
              ? "No projects are available yet."
              : "No projects assigned to your workgroup. Please contact administration."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Monitor tickets across {selectedProjectId ? "the selected project" : "all accessible projects"}.
          </p>
        </div>
      </div>

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
          allTickets={projectScopedTickets}
          workgroups={visibleWorkgroups}
          resetKey={selectedProjectId || "all-projects"}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          projectAllLabel={user?.role_id === 1 ? "All projects" : "All accessible projects"}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TotalPendingTickets tickets={filteredTickets} />
        <PendingTicketsPerTypeChart tickets={filteredTickets} />
        <OpenTicketsPieChart tickets={filteredTickets} workgroups={workgroups}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TicketPriorityChart tickets={filteredTickets} />
        <TicketStatusChart tickets={filteredTickets} />
        <TicketModuleStackedChart tickets={filteredTickets} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <TicketsCreatedLineChart tickets={filteredTickets} />
      </div>
    </div>
  );
};

export default Dashboard;
