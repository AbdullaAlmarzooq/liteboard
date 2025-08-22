import React, { useState, useEffect } from 'react';
import useFetch from '../../useFetch'; 

/**
 * @param {function} onTicketSelect
 */


const SearchBar = ({ onTicketSelect }) => {

  const { data: allTickets, isPending, error } = useFetch('http://localhost:8000/tickets');


  const [searchTerm, setSearchTerm] = useState('');

  const [searchResults, setSearchResults] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);


  const handleSearch = () => {

    if (isPending || error || !allTickets) {
      console.warn("Cannot search: data is not available yet.");
      return;
    }


    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsModalOpen(false);
      return;
    }


    const lowerCaseSearchTerm = searchTerm.toLowerCase();


    const filtered = allTickets.filter(ticket => {
      const titleMatch = ticket.title?.toLowerCase().includes(lowerCaseSearchTerm);
      const idMatch = ticket.id?.toString().toLowerCase().includes(lowerCaseSearchTerm);
      const workGroupMatch = ticket.workGroup?.toLowerCase().includes(lowerCaseSearchTerm);
      const responsibleMatch = ticket.responsible?.toLowerCase().includes(lowerCaseSearchTerm);
      const moduleMatch = ticket.module?.toLowerCase().includes(lowerCaseSearchTerm);
      const descriptionMatch = ticket.description?.toLowerCase().includes(lowerCaseSearchTerm);
      const tagsMatch = ticket.tags?.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm));


      return titleMatch || idMatch || workGroupMatch || responsibleMatch || moduleMatch || descriptionMatch || tagsMatch;
    });

    setSearchResults(filtered); 
    setIsModalOpen(true);      
  };


  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md items-center">

      <input
        type="text"
        placeholder={isPending ? "Loading tickets..." : (error ? "Error loading tickets" : "Search tickets by title, ID, description, tags, etc.")}
        className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)} 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSearch(); 
          }
        }}
        disabled={isPending || error || !allTickets} 
      />

      <button
        onClick={handleSearch}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending || error || !allTickets} 
      >
        {isPending ? 'Loading...' : 'Search'}
      </button>


      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform scale-100 opacity-100 transition-all duration-300 ease-out animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Search Results</h2>
              {/* Close button for the modal */}
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            {/* Modal Content */}
            <div className="p-5">
              {searchResults.length > 0 ? (
                <ul className="space-y-4">
                  {/* Map through search results and display each ticket */}
                  {searchResults.map(ticket => (
                    <li
                      key={ticket.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200"
                      onClick={() => {

                        if (onTicketSelect) {
                          onTicketSelect(`view-ticket-${ticket.id}`);
                        }
                        closeModal(); 
                      }}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{ticket.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">ID: {ticket.id}</p>
                      {/* Display a snippet of the description if available */}
                      {ticket.description && (
                         <p className="text-sm text-gray-600 dark:text-gray-400">
                           Description: {ticket.description.substring(0, 70)}{ticket.description.length > 70 ? '...' : ''}
                         </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status: {ticket.status}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Priority: {ticket.priority}</p>
                      {/* Add more ticket details here as needed */}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400">No tickets found matching "{searchTerm}".</p>
              )}
            </div>
            {/* Modal Footer (with close button if there are results) */}
            {searchResults.length > 0 && (
                <div className="p-5 border-t border-gray-200 dark:border-gray-700 text-right">
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                        Close
                    </button>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
