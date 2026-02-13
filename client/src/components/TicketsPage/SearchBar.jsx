import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useFetch from '../../useFetch'
import { Search } from 'lucide-react';

const SearchBar = () => {
  const navigate = useNavigate()
  
  // Fetch raw tickets data from API
  const { data: rawTickets, isPending, error } = useFetch('http://localhost:8000/api/tickets')
  
  // Transform the raw data to match the format expected by the component
  const tickets = useMemo(() => {
    if (!rawTickets) return [];
    
    return rawTickets.map(ticket => ({
      id: ticket.id,
      ticketCode: ticket.ticket_code || ticket.ticketCode,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      workflowId: ticket.workflow_id,
      workgroupId: ticket.workgroup_id,
      workGroup: ticket.workgroup_name || 'Unassigned',
      moduleId: ticket.module_id,
      module: ticket.module_name || 'No Module',
      initiateDate: ticket.initiate_date || ticket.initiateDate || ticket.created_at || ticket.createdAt,
      updatedAt: ticket.updated_at || ticket.updatedAt,
      responsibleEmployeeId: ticket.responsible_employee_id,
      responsible: ticket.responsible_name || 'Unassigned',
      tags: ticket.tags || [],
      dueDate: ticket.due_date,
    }));
  }, [rawTickets]);

  const getDisplayTicketCode = (ticket) => ticket.ticketCode || ticket.id;

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Helper function to format initiate date
  const formatInitiateDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown'
    }
  }

  // Helper function to sort tickets by update date (newest first)
  const sortTicketsByUpdatedDate = (tickets) => {
    return [...tickets].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.initiateDate || 0)
      const dateB = new Date(b.updatedAt || b.initiateDate || 0)
      return dateB - dateA // Newest first (descending order)
    })
  }

  // Helper function to extract searchable text from tags
  const getSearchableTagText = (tags) => {
    if (!tags || !Array.isArray(tags)) return ''
    
    return tags.map(tag => {
      // Handle both old format (strings) and new format (objects)
      if (typeof tag === 'string') return tag
      if (typeof tag === 'object' && tag.name) return tag.name
      if (typeof tag === 'object' && tag.label) return tag.label // fallback
      return ''
    }).join(' ').toLowerCase()
  }

  const handleSearch = () => {
    if (isPending || error || !tickets) return
    if (!searchTerm.trim()) {
      setSearchResults([])
      setIsModalOpen(false)
      return
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    const filtered = tickets.filter(ticket => {
      // Get searchable tag text
      const tagText = getSearchableTagText(ticket.tags)
      
      return (
        ticket.title?.toLowerCase().includes(lowerCaseSearchTerm) ||
        getDisplayTicketCode(ticket)?.toString().toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.workGroup?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.responsible?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.module?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.description?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.status?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.priority?.toLowerCase().includes(lowerCaseSearchTerm) ||
        tagText.includes(lowerCaseSearchTerm)
      )
    })

    // Sort the filtered results by last update date (newest first)
    const sortedResults = sortTicketsByUpdatedDate(filtered)
    
    setSearchResults(sortedResults)
    setIsModalOpen(true)
  }

  const closeModal = () => setIsModalOpen(false)

  // Helper function to get status-based styling
  const getStatusStyling = (status) => {
    const normalizedStatus = status?.toLowerCase()
    
    switch (normalizedStatus) {
      case 'cancelled':
        return {
          card: 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          hover: 'hover:bg-gray-200 dark:hover:bg-gray-650 hover:border-gray-400 dark:hover:border-gray-500'
        }
      case 'closed':
        return {
          card: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
          hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-600'
        }
      case 'open':
        return {
          card: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
          hover: 'hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-300 dark:hover:border-green-600'
        }
      case 'in progress':
        return {
          card: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
          hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/40 hover:border-yellow-300 dark:hover:border-yellow-600'
        }
      default:
        return {
          card: 'bg-gray-50 dark:bg-gray-500/20 border-gray-200 dark:border-gray-400',
          hover: 'hover:bg-gray-100 dark:hover:bg-gray-900/30 hover:border-gray-300 dark:hover:border-gray-700'
        }
    }
  }

  // Helper function to get priority badge styling
  const getPriorityBadge = (priority) => {
    const normalizedPriority = priority?.toLowerCase()
    
    switch (normalizedPriority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const handleTicketClick = (ticketId, event) => {
    // Prevent any event bubbling
    event.preventDefault()
    event.stopPropagation()
    
    console.log('Navigating to ticket ID:', ticketId) // Debug log
    
    // Close modal first
    setIsModalOpen(false)
    
    // Navigate to the ticket
    navigate(`/view-ticket/${ticketId}`)
  }

  const isLoading = isPending
  const hasError = error
  const hasTickets = tickets && tickets.length > 0

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm items-center">
      <input
        type="text"
        placeholder={isLoading ? "Loading tickets..." : (hasError ? "Error loading tickets" : "Search tickets by title, ID, workgroup, responsible, module, tags...")}
        className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        disabled={isLoading || hasError || !hasTickets}
      />

      <button
        onClick={handleSearch}
        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed transition-colors"
        disabled={isLoading || hasError || !hasTickets || !searchTerm.trim()}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Loading...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Search
          </>
        )}
      </button>

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal} // Close modal when clicking backdrop
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
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
                ✕
              </button>
            </div>

            <div className="p-6">
              {searchResults.length > 0 ? (
                <ul className="space-y-4">
                  {searchResults.map(ticket => {
                    const statusStyling = getStatusStyling(ticket.status)
                    return (
                      <li
                        key={ticket.id}
                        className={`p-4 ${statusStyling.card} rounded-lg cursor-pointer ${statusStyling.hover} transition-all duration-200 border-2`}
                        onClick={(e) => handleTicketClick(getDisplayTicketCode(ticket), e)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold dark:text-white flex-1 pr-4">{ticket.title}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatInitiateDate(ticket.initiateDate)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            <p><span className="font-medium">ID:</span> {getDisplayTicketCode(ticket)}</p>
                            <p><span className="font-medium">WorkGroup:</span> {ticket.workGroup || 'Unassigned'}</p>
                            <p><span className="font-medium">Responsible:</span> {ticket.responsible || 'Unassigned'}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Module:</span> {ticket.module || 'No Module'}</p>
                            {ticket.dueDate && (
                              <p><span className="font-medium">Due:</span> {new Date(ticket.dueDate).toLocaleDateString()}</p>
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
                              {ticket.tags.slice(0, 3).map((tag, index) => {
                                const tagName = typeof tag === 'string' ? tag : (tag.name || tag.label || 'Unknown')
                                return (
                                  <span key={index} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">
                                    {tagName}
                                  </span>
                                )
                              })}
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
                            {ticket.description.length > 100 
                              ? `${ticket.description.substring(0, 100)}...` 
                              : ticket.description
                            }
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    No tickets found for "{searchTerm}".
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    Try different keywords or check your spelling.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchBar
