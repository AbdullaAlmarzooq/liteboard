import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useFetch from '../../useFetch'

const SearchBar = () => {
  const navigate = useNavigate()
  const { data: allTickets, isPending, error } = useFetch('http://localhost:8000/tickets')

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)

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

    setSearchResults(filtered)
    setIsModalOpen(true)
  }

  const closeModal = () => setIsModalOpen(false)

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
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md items-center">
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
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        disabled={isPending || error || !allTickets}
      >
        {isPending ? 'Loading...' : 'Search'}
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
              <h2 className="text-xl font-bold dark:text-white">Search Results</h2>
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
                  {searchResults.map(ticket => (
                    <li
                      key={ticket.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-blue-300"
                      onClick={(e) => handleTicketClick(ticket.id, e)}
                    >
                      <h3 className="text-lg font-semibold dark:text-white mb-2">{ticket.title}</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p>ID: {ticket.id}</p>
                        <p>Status: <span className="capitalize">{ticket.status}</span></p>
                        <p>Priority: <span className="capitalize">{ticket.priority}</span></p>
                        {ticket.workGroup && <p>Work Group: {ticket.workGroup}</p>}
                      </div>
                    </li>
                  ))}
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