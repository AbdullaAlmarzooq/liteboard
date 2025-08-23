import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Badge from "../components/Badge"
import Button from "../components/Button"
import TicketFilter from "../components/TicketsPage/TicketFilter"
import useFetch from "../useFetch"
import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'
import SearchBar from "../components/TicketsPage/SearchBar";
import TicketExporter from "../components/TicketsPage/TicketExporter"
import Pagination from "../components/TicketsPage/Pagination" // Import the new component
import { Eye, Edit, Trash2, Plus, AlertTriangle, X } from 'lucide-react';


const TicketsPage = () => {
  const navigate = useNavigate()
  const { data: tickets, isPending, error } = useFetch('http://localhost:8000/tickets');
  const [isDeleting, setIsDeleting] = useState(null);
  const [filteredTickets, setFilteredTickets] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [currentPage, setCurrentPage_] = useState(1); // Renamed to avoid conflict
  const [itemsPerPage, setItemsPerPage] = useState(10); // State for items per page

  // Sort tickets by extracting numeric part from ID in descending order (newest first)
  const sortedTickets = useMemo(() => {
    if (!tickets) return [];
    return [...tickets].sort((a, b) => {
      const aNum = parseInt(a.id.split('-')[1]);
      const bNum = parseInt(b.id.split('-')[1]);
      return bNum - aNum;
    });
  }, [tickets]);

  // Combined tickets to display, filtered first, then sorted
  const ticketsToDisplay = filteredTickets !== null ? filteredTickets : sortedTickets;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = ticketsToDisplay.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to first page when filters or page size change
  useEffect(() => {
    setCurrentPage_(1);
  }, [ticketsToDisplay, itemsPerPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage_(pageNumber);
  };

  const handleItemsPerPageChange = (size) => {
    setItemsPerPage(size);
  };


  const getStatusVariant = status => {
    switch (status) {
      case "Closed":
        return "default"
      case "In Progress":
        return "outline"
      case "Open":
        return "outline"
      default:
        return "outline"
    }
  }

  const getPriorityVariant = priority => {
    switch (priority) {
      case "Critical":
        return "destructive"
      case "High":
        return "destructive"
      case "Medium":
        return "secondary"
      case "Low":
        return "outline"
      default:
        return "outline"
    }
  }

  const handleEdit = (ticketId) => {
    navigate(`/edit-ticket/${ticketId}`);
  };

  const openDeleteModal = (ticket) => {
    setTicketToDelete(ticket);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setTicketToDelete(null);
  };

  const handleDelete = async () => {
    if (!ticketToDelete) return;

    setIsDeleting(ticketToDelete.id);
    
    try {
      const response = await fetch(`http://localhost:8000/tickets/${ticketToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        closeDeleteModal();
        window.location.reload();
      } else {
        alert('Failed to delete ticket');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error deleting ticket');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleView = (ticketId) => {
    navigate(`/view-ticket/${ticketId}`);
  };

const handleFilteredTicketsChange = (newFilteredTickets) => {
    setFilteredTickets(newFilteredTickets);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">Error loading tickets: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">  
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tickets
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
          </p>
        </div>
        <div className="flex gap-3">

        <TicketExporter ticketsToExport={ticketsToDisplay} />
      </div>
      </div>

            <TicketFilter
        tickets={sortedTickets}
        onFilteredTicketsChange={handleFilteredTicketsChange}
      />

        <SearchBar allTickets={tickets || []} />

      {/* Desktop Table View */}
      <div className="hidden lg:block">
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader>
            <CardTitle></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-700">
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      ID
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Priority
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      WorkGroup
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Responsible
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Module
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Tags
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Due Date
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentTickets.map(ticket => { // Use currentTickets for the paged data
                    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
                    return (
                      <tr
                        key={ticket.id}
                        className="border-b border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="p-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                          {ticket.id}
                        </td>
                        <td className="p-3 font-medium text-gray-900 dark:text-white">
                          {ticket.title}
                        </td>
                        <td className="p-3">
                          <Badge variant={getStatusVariant(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={getPriorityVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {ticket.workGroup}
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {ticket.responsible}
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {ticket.module}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {ticket.tags?.map(tag => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            {ticket.dueDate}
                            {isOverdue && (
                              <span className="text-red-500 text-xs">⚠️</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/view-ticket/${ticket.id}`)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 hover:text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-800/30 dark:hover:text-blue-200 flex items-center gap-1 transition-colors duration-200"
                            >
                              <Eye className="w-3 h-3" />
                              
                            </button>
                            <button
                              onClick={() => navigate(`/edit-ticket/${ticket.id}`)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 hover:text-gray-900 dark:bg-gray-900/20 dark:text-gray-400 dark:hover:bg-gray-800/30 dark:hover:text-gray-300 flex items-center gap-1 transition-colors duration-200"
                            >
                              <Edit className="w-3 h-3" />
                              
                            </button>
                            <button
                              onClick={() => openDeleteModal(ticket)}
                              disabled={isDeleting === ticket.id}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 hover:text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-800/30 dark:hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors duration-200"
                            >
                              <Trash2 className="w-3 h-3" />
                              {isDeleting === ticket.id ? 'Deleting...' : ''}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {currentTickets.map(ticket => { // Use currentTickets for the paged data
          const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
          return (
            <Card key={ticket.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                    {ticket.id}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {ticket.status}
                    </Badge>
                    <Badge variant={getPriorityVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg">{ticket.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      WorkGroup:
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {ticket.workGroup}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Module:
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {ticket.module}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Responsible:
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {ticket.responsible}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Due Date:
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      {ticket.dueDate}
                      {isOverdue && (
                        <span className="text-red-500 text-xs">⚠️</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Tags:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ticket.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleView(ticket.id)}
                    className="flex-1 px-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 hover:text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-800/30 dark:hover:text-blue-200 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(ticket.id)}
                    className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 hover:text-gray-900 dark:bg-gray-900/20 dark:text-gray-400 dark:hover:bg-gray-800/30 dark:hover:text-gray-300 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(ticket)}
                    disabled={isDeleting === ticket.id}
                    className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 hover:text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-800/30 dark:hover:text-red-200 disabled:opacity-50 flex items-center justify-center gap-1"                  >
                    <Trash2 className="w-3 h-3" />
                    {isDeleting === ticket.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No tickets message */}
      {ticketsToDisplay.length === 0 && tickets && tickets.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No tickets match your current filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add the Pagination component here */}
      <Pagination
        totalItems={ticketsToDisplay.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Ticket
                </h3>
              </div>
              <button
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to delete this ticket? This action cannot be undone.
              </p>
              
              {ticketToDelete && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      {ticketToDelete.id}
                    </span>
                    <div className="flex gap-2">
                      <Badge variant={getStatusVariant(ticketToDelete.status)} className="text-xs">
                        {ticketToDelete.status}
                      </Badge>
                      <Badge variant={getPriorityVariant(ticketToDelete.priority)} className="text-xs">
                        {ticketToDelete.priority}
                      </Badge>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {ticketToDelete.title}
                  </h4>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-md transition-colors flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export default TicketsPage