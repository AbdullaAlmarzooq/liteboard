import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { appendTicketFilterParams } from "./ticketFilterQuery";

const SearchBar = ({
  resetKey = "default",
  selectedProjectId = "",
  activeFilters = {},
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    setSearchTerm("");
    setSearchResults([]);
    setIsModalOpen(false);
    setSearchError("");
  }, [resetKey]);

  const formatInitiateDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  const closeModal = () => setIsModalOpen(false);
  const getDisplayTicketCode = (ticket) => ticket.ticket_code || ticket.ticketCode || ticket.id;

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults([]);
      setIsModalOpen(false);
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        q: term,
        limit: "200",
      });

      if (selectedProjectId) {
        params.set("project_id", selectedProjectId);
      }
      appendTicketFilterParams(params, activeFilters);

      const response = await fetch(`http://localhost:8000/api/tickets/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to search tickets");
      }

      const data = await response.json();
      setSearchResults(Array.isArray(data.items) ? data.items : []);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error searching tickets:", error);
      setSearchError("Search failed. Please try again.");
      setSearchResults([]);
      setIsModalOpen(true);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusStyling = (status) => {
    const normalizedStatus = status?.toLowerCase();

    switch (normalizedStatus) {
      case "cancelled":
        return {
          card: "bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
          hover: "hover:bg-gray-200 dark:hover:bg-gray-650 hover:border-gray-400 dark:hover:border-gray-500",
        };
      case "closed":
        return {
          card: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700",
          hover: "hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-600",
        };
      case "open":
        return {
          card: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700",
          hover: "hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-600",
        };
      case "in progress":
        return {
          card: "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700",
          hover: "hover:bg-yellow-100 dark:hover:bg-yellow-900/40 hover:border-yellow-300 dark:hover:border-yellow-600",
        };
      default:
        return {
          card: "bg-gray-50 dark:bg-gray-500/20 border-gray-200 dark:border-gray-400",
          hover: "hover:bg-gray-100 dark:hover:bg-gray-900/30 hover:border-gray-300 dark:hover:border-gray-700",
        };
    }
  };

  const getPriorityBadge = (priority) => {
    const normalizedPriority = priority?.toLowerCase();

    switch (normalizedPriority) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const handleTicketClick = (ticketId, event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsModalOpen(false);
    navigate(`/view-ticket/${ticketId}`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Search tickets</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Search across all matching tickets for the selected project and filters.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search tickets by title, ID, workgroup, responsible, module, tags..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={isSearching}
          />
        </div>

        <button
          onClick={handleSearch}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-400 sm:min-w-[140px]"
          disabled={isSearching || !searchTerm.trim()}
        >
          {isSearching ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search
            </>
          )}
        </button>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="text-xl font-bold dark:text-white">
                Search Results
                {searchResults.length > 0 && (
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                    ({searchResults.length} found)
                  </span>
                )}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close modal"
              >
                x
              </button>
            </div>

            <div className="p-6">
              {searchError && (
                <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {searchError}
                </div>
              )}

              {!searchError && searchResults.length > 0 ? (
                <ul className="space-y-4">
                  {searchResults.map((ticket) => {
                    const statusStyling = getStatusStyling(ticket.status);
                    return (
                      <li
                        key={ticket.id}
                        className={`p-4 ${statusStyling.card} rounded-lg cursor-pointer ${statusStyling.hover} transition-all duration-200 border-2`}
                        onClick={(e) => handleTicketClick(getDisplayTicketCode(ticket), e)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold dark:text-white flex-1 pr-4">{ticket.title}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatInitiateDate(ticket.initiate_date || ticket.created_at)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            <p><span className="font-medium">ID:</span> {getDisplayTicketCode(ticket)}</p>
                            <p><span className="font-medium">WorkGroup:</span> {ticket.workgroup_name || "Unassigned"}</p>
                            <p><span className="font-medium">Responsible:</span> {ticket.responsible_name || "Unassigned"}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Module:</span> {ticket.module_name || "No Module"}</p>
                            {ticket.due_date && (
                              <p><span className="font-medium">Due:</span> {new Date(ticket.due_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {ticket.status}
                          </span>
                          {ticket.tags && ticket.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ticket.tags.slice(0, 3).map((tag) => (
                                <span key={tag.id} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">
                                  {tag.name}
                                </span>
                              ))}
                              {ticket.tags.length > 3 && (
                                <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">
                                  +{ticket.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {ticket.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {ticket.description.length > 140
                              ? `${ticket.description.substring(0, 140)}...`
                              : ticket.description}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    {searchError ? "Unable to complete search." : `No tickets found for "${searchTerm}".`}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    Try different keywords or broaden your filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
