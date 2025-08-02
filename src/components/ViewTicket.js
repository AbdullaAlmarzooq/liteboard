import { Card, CardContent, CardHeader, CardTitle } from "./Card"
import Badge from "./Badge"
import Button from "./Button"
import useFetch from "../useFetch"
import { useState, useEffect } from 'react';

const ViewTicket = ({ ticketId, setCurrentPage }) => {
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/tickets/${ticketId}`);
  const { data: statusHistory, isPending: isHistoryPending, error: historyError } = useFetch(`http://localhost:8000/status_history?ticketId=${ticketId}`);

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

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleString('en-US', options);
  };

  const formatFieldName = (fieldName) => {
    switch (fieldName) {
      case 'workGroup':
        return 'Work Group';
      case 'responsible':
        return 'Responsible Person';
      case 'dueDate':
        return 'Due Date';
      case 'startDate':
        return 'Start Date';
      case 'module':
        return 'Module';
      case 'title':
        return 'Title';
      case 'description':
        return 'Description';
      case 'priority':
        return 'Priority';
      case 'tags_added':
        return 'Added Tag';
      case 'tags_removed':
        return 'Removed Tag';
      default:
        return fieldName;
    }
  };

  // State to hold the combined and sorted timeline data
  const [timeline, setTimeline] = useState([]);

  // Effect to combine and sort the data once both API calls are complete
  useEffect(() => {
    if (ticket && statusHistory) {
      const commentsWithTypes = (ticket.comments || []).map(comment => ({
        ...comment,
        type: 'comment'
      }));

      const combinedTimeline = [...commentsWithTypes, ...statusHistory];

      combinedTimeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setTimeline(combinedTimeline);
    }
  }, [ticket, statusHistory]);

  if (isPending || isHistoryPending) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading ticket details...</div>
      </div>
    );
  }

  if (error || historyError) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-red-500">Error loading ticket: {error || historyError}</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Ticket not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 dark:bg-gray-900 dark:text-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage("tickets")}
          >
            ← Back to Tickets
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Ticket Details
        </h1>
        <Button
          variant="secondary"
          onClick={() => setCurrentPage(`edit-ticket-${ticketId}`)}
        >
          Edit Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-semibold">
                {ticket.title}
              </CardTitle>
              <Badge variant={getStatusVariant(ticket.status)}>
                {ticket.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  {ticket.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags && ticket.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Combined Activity Log Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <ul className="space-y-4">
                  {timeline.map((item, index) => (
                    <li key={index} className="flex items-start space-x-4">
                      {/* Timeline dot */}
                      <div className={`h-2 w-2 rounded-full mt-2 ${item.type === 'comment' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      <div className="flex-1">
                        {item.type === 'comment' ? (
                          // Render for comments
                          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {item.author} commented:
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimestamp(item.timestamp)}
                              </p>
                            </div>
                            <p className="mt-2 text-gray-700 dark:text-gray-300">
                              {item.text}
                            </p>
                          </div>
                        ) : item.type === 'status_change' ? (
                          // Render for status changes
                          <div>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              Status changed from <span className="font-semibold">{item.oldValue || 'N/A'}</span> to <span className="font-semibold">{item.newValue || 'N/A'}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              by {item.changedBy} on {formatTimestamp(item.timestamp)}
                            </p>
                          </div>
                        ) : item.fieldName === 'tags_added' ? (
                          // Render for added tags
                          <div>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              Added tag: <span className="font-semibold">{item.newValue}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              by {item.changedBy} on {formatTimestamp(item.timestamp)}
                            </p>
                          </div>
                        ) : item.fieldName === 'tags_removed' ? (
                           // Render for removed tags
                           <div>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              Removed tag: <span className="font-semibold">{item.oldValue}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              by {item.changedBy} on {formatTimestamp(item.timestamp)}
                            </p>
                          </div>
                        ) : (
                          // Render for general field changes
                          <div>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              Changed {formatFieldName(item.fieldName)} from <span className="font-semibold">{item.oldValue || 'N/A'}</span> to <span className="font-semibold">{item.newValue || 'N/A'}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              by {item.changedBy} on {formatTimestamp(item.timestamp)}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-gray-500">No activity found for this ticket.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Priority
                </label>
                <div className="mt-1">
                  <Badge variant={getPriorityVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Workgroup
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.workGroup}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Responsible
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.responsible}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Module
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.module}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Start Date
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.startDate || 'N/A'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Due Date
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.dueDate || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewTicket;
