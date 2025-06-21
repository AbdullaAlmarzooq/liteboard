import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Badge from "../components/Badge"
import Button from "../components/Button"
import TicketFilter from "../components/TicketFilter"
import useFetch from "../useFetch"
import { useRef, useState } from 'react';


const TicketsPage = ({ setCurrentPage }) => {
const { data: tickets, isPending, error } = useFetch('http://localhost:8000/tickets');
const [isDeleting, setIsDeleting] = useState(null);
const [filteredTickets, setFilteredTickets] = useState(null);



  const getStatusVariant = status => {
    switch (status) {
      case "Closed":
        return "default"
      case "In Progress":
        return "secondary"
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

  const displayTickets = filteredTickets !== null ? filteredTickets : (tickets || []);

  const handleEdit = (ticketId) => {
    // Navigate to edit page with ticket ID
    setCurrentPage(`edit-ticket-${ticketId}`);
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    setIsDeleting(ticketId);
    
    try {
      const response = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the page or update the tickets list
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
    // Navigate to view ticket details page
    setCurrentPage(`view-ticket-${ticketId}`);
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
        <Button onClick={() => setCurrentPage("create-ticket")}>
          <span className="mr-2">➕</span>
          Create Ticket
        </Button>
      </div>

            <TicketFilter
        tickets={tickets}
        onFilteredTicketsChange={handleFilteredTicketsChange}
      />

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
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
                      Work Group
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
                  {displayTickets.map(ticket => {
                    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
                    return (
                      <tr
                        key={ticket.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
                              onClick={() => handleView(ticket.id)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEdit(ticket.id)}
                              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(ticket.id)}
                              disabled={isDeleting === ticket.id}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              {isDeleting === ticket.id ? 'Deleting...' : 'Delete'}
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
        {displayTickets.map(ticket => {
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
                      Work Group:
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
                    className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(ticket.id)}
                    className="flex-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ticket.id)}
                    disabled={isDeleting === ticket.id}
                    className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isDeleting === ticket.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No tickets message */}
      {displayTickets.length === 0 && tickets && tickets.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No tickets match your current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


export default TicketsPage
