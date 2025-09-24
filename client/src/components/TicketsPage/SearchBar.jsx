import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useFetch from '../../useFetch'
import { Search } from 'lucide-react';


const SearchBar = () => {
  const navigate = useNavigate()
  const { data: allTickets, isPending, error } = useFetch('http://localhost:8000/tickets')

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

  // Helper function to sort tickets by initiate date (newest first)
  const sortTicketsByInitiateDate = (tickets) => {
    return [...tickets].sort((a, b) => {
      const dateA = new Date(a.initiateDate || 0)
      const dateB = new Date(b.initiateDate || 0)
      return dateB - dateA // Newest first (descending order)
    })
  }

  const handleSearch = () => {
    if (isPending || error || !allTickets) return
    if (!searchTerm.trim()) {
      setSearchResults([])
      setIsModalOpen(false)
      return
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    const filtered = allTickets.filter(ticket => {
      return (
        ticket.title?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.id?.toString().toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.workGroup?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.responsible?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.module?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.description?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.tags?.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm))
      )
    })

    // Sort the filtered results by initiate date (newest first)
    const sortedResults = sortTicketsByInitiateDate(filtered)
    
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
      default:
        return {
          card: 'bg-gray-50 dark:bg-gray-500/20 border-gray-200 dark:border-gray-400',
          hover: 'hover:bg-gray-100 dark:hover:bg-gray-900/30 hover:border-gray-300 dark:hover:border-gray-700'
        }
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

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm items-center">
      <input
        type="text"
        placeholder={isPending ? "Loading tickets..." : (error ? "Error loading tickets" : "Search tickets...")}
        className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        disabled={isPending || error || !allTickets}
      />

      <button
        onClick={handleSearch}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isPending || error || !allTickets}
      >
        {isPending ? 'Loading...' : <Search />}
      </button>

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal} // Close modal when clicking backdrop
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
          >
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold dark:text-white">
                Search Results 
                {searchResults.length > 0 && (
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                    ({searchResults.length} found, sorted by newest)
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

            <div className="p-5">
              {searchResults.length > 0 ? (
                <ul className="space-y-4">
                  {searchResults.map(ticket => {
                    const statusStyling = getStatusStyling(ticket.status)
                    return (
                      <li
                        key={ticket.id}
                        className={`p-4 ${statusStyling.card} rounded-md cursor-pointer ${statusStyling.hover} transition-colors border`}
                        onClick={(e) => handleTicketClick(ticket.id, e)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold dark:text-white flex-1">{ticket.title}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                            {formatInitiateDate(ticket.initiateDate)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <p>ID: {ticket.id}</p>
                          <p>Status: <span className="capitalize">{ticket.status}</span></p>
                          <p>Priority: <span className="capitalize">{ticket.priority}</span></p>
                          {ticket.workGroup && <p>WorkGroup: {ticket.workGroup}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                  No tickets found for "{searchTerm}".
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchBar