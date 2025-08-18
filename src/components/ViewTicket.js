import { Card, CardContent, CardHeader, CardTitle } from "./Card"
import Badge from "./Badge"
import Button from "./Button"
import useFetch from "../useFetch"
import { useState, useEffect } from 'react'
import ReactFlow, { Background } from 'reactflow'
import { MessageSquare, RefreshCw, Tag, MinusCircle, Edit3 } from "lucide-react";
import 'reactflow/dist/style.css'

const WorkflowDiagram = ({ steps, currentStepName }) => {
  if (!steps || steps.length === 0) return null;

  const nodes = steps.map((step, i) => {
    const isCurrent = step.stepName === currentStepName;
    return {
      id: `step-${i}`,
      position: { x: i * 200, y: 50 },
      data: { label: step.stepName },
      style: {
        border: isCurrent
          ? '2px solid var(--highlight-color)'
          : '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '10px',
        background: isCurrent
          ? 'var(--highlight-bg)'
          : 'var(--node-bg)',
        color: isCurrent
          ? 'var(--highlight-text)'
          : 'var(--text-color)',
        fontSize: '12px',
        fontWeight: isCurrent ? 'bold' : 'normal',
        boxShadow: isCurrent
          ? '0 0 12px var(--highlight-shadow)'
          : 'none',
      },
      sourcePosition: 'right',
      targetPosition: 'left',
    };
  });

  const edges = steps.slice(0, -1).map((_, i) => ({
    id: `edge-${i}`,
    source: `step-${i}`,
    target: `step-${i + 1}`,
    type: 'smoothstep',
    style: { stroke: 'var(--edge-color)' },
  }));

  return (
    <div
      style={{
        height: 200,
        '--highlight-color': '#3b82f6',          // blue-500
        '--highlight-bg': 'rgba(59,130,246)', // light transparent blue
        '--highlight-text': '#1e3a8a',            // darker blue text
        '--highlight-shadow': 'rgba(59,130,246,0.5)',
        '--node-bg': '#ffffff',                  // light mode default node
        '--border-color': '#d1d5db',             // gray-300
        '--text-color': '#111827',               // gray-900
        '--edge-color': '#9ca3af',               // gray-400
      }}
      className="mt-4 border border-gray-300 rounded-md
        dark:[--highlight-color:#60a5fa] 
        dark:[--highlight-bg:rgba(96,165,250,0.2)]
        dark:[--highlight-text:#dbeafe] 
        dark:[--highlight-shadow:rgba(96,165,250,0.6)]
        dark:[--node-bg:#1f2937] 
        dark:[--border-color:#374151]
        dark:[--text-color:#f9fafb] 
        dark:[--edge-color:#6b7280]"
    >
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
      </ReactFlow>
    </div>
  );
};

// Cancel Ticket Modal Component
const CancelTicketModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!comment.trim()) {
      setError('Comment is required to cancel the ticket')
      return
    }
    onConfirm(comment.trim())
  }

  const handleClose = () => {
    setComment('')
    setError('')
    onClose()
  }

  useEffect(() => {
    if (comment.trim()) {
      setError('')
    }
  }, [comment])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Cancel Ticket
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Are you sure you want to cancel this ticket? This action cannot be undone.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="cancelComment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="cancelComment"
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please provide a reason for cancelling this ticket..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isLoading}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Keep Ticket
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isLoading || !comment.trim()}
              >
                {isLoading ? 'Cancelling...' : 'Cancel Ticket'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const ViewTicket = ({ ticketId, setCurrentPage }) => {
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/tickets/${ticketId}`)
  const { data: statusHistory, isPending: isHistoryPending, error: historyError } = useFetch(`http://localhost:8000/status_history?ticketId=${ticketId}`)
  
  // Cancel ticket modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  
  // Fetch workflow if ticket has workflowId
  const [workflow, setWorkflow] = useState(null)
  useEffect(() => {
    if (ticket?.workflowId) {
      fetch(`http://localhost:8000/workflows/${ticket.workflowId}`)
        .then(res => res.json())
        .then(data => setWorkflow(data))
        .catch(err => console.error("Error fetching workflow:", err))
    }
  }, [ticket])

  // Handle cancel ticket
  const handleCancelTicket = async (comment) => {
    setIsCancelling(true)
    try {
      // Generate a unique comment ID
      const commentId = `${ticketId}-${String(Date.now()).slice(-3)}`
      
      // Create the cancellation comment
      const cancellationComment = {
        id: commentId,
        text: `Ticket cancelled. Reason: ${comment}`,
        author: "Current User", // Replace with actual user context
        timestamp: new Date().toISOString()
      }

      // Update the ticket with cancelled status and add the comment
      const updatedTicket = {
        ...ticket,
        status: "Cancelled",
        comments: [...(ticket.comments || []), cancellationComment]
      }

      const response = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTicket),
      })

      if (response.ok) {
        // Close modal and refresh the page data
        setShowCancelModal(false)
        window.location.reload() // Simple refresh, or implement proper state update
      } else {
        const errorData = await response.json()
        alert(`Failed to cancel ticket: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error cancelling ticket:', error)
      alert('Failed to cancel ticket. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  const getStatusVariant = status => {
    switch (status) {
      case "Cancelled": return "destructive"
      case "Closed": return "default"
      case "In Progress": return "secondary"
      case "Open": return "outline"
      default: return "outline"
    }
  }

  const getPriorityVariant = priority => {
    switch (priority) {
      case "Critical": return "destructive"
      case "High": return "destructive"
      case "Medium": return "secondary"
      case "Low": return "outline"
      default: return "outline"
    }
  }

  const formatTimestamp = timestamp => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatFieldName = (fieldName) => {
    switch (fieldName) {
      case 'workGroup': return 'Work Group'
      case 'responsible': return 'Responsible Person'
      case 'dueDate': return 'Due Date'
      case 'startDate': return 'Start Date'
      case 'module': return 'Module'
      case 'title': return 'Title'
      case 'description': return 'Description'
      case 'priority': return 'Priority'
      case 'tags_added': return 'Added Tag'
      case 'tags_removed': return 'Removed Tag'
      default: return fieldName
    }
  }

  const [timeline, setTimeline] = useState([])
  useEffect(() => {
    if (ticket && statusHistory) {
      const commentsWithTypes = (ticket.comments || []).map(comment => ({
        ...comment,
        type: 'comment'
      }))
      const combinedTimeline = [...commentsWithTypes, ...statusHistory]
      combinedTimeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      setTimeline(combinedTimeline)
    }
  }, [ticket, statusHistory])

  // Check if ticket can be cancelled (not already closed or cancelled)
  const canCancelTicket = ticket && !['Closed', 'Cancelled'].includes(ticket.status)

  if (isPending || isHistoryPending) {
    return <div className="flex items-center justify-center min-h-64 text-gray-500">Loading ticket details...</div>
  }
  if (error || historyError) {
    return <div className="flex items-center justify-center min-h-64 text-red-500">Error loading ticket: {error || historyError}</div>
  }
  if (!ticket) {
    return <div className="flex items-center justify-center min-h-64 text-gray-500">Ticket not found</div>
  }

  return (
    <div className="flex flex-col h-full space-y-6 dark:bg-gray-900 dark:text-white p-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage("tickets")}>← Back to Tickets</Button>
        <h1 className="text-3xl font-bold">Ticket Details</h1>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={() => setCurrentPage(`edit-ticket-${ticketId}`)}>
            Edit Ticket
          </Button>
          {canCancelTicket && (
            <Button 
              variant="destructive" 
              onClick={() => setShowCancelModal(true)}
              disabled={isCancelling}
            >
              Cancel Ticket
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        <div className="md:col-span-2 space-y-6">
          {/* Ticket info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">{ticket.title}</CardTitle>
              <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">{ticket.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {ticket.tags?.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Workflow diagram (only if workflow found) */}
          {workflow && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Workflow: {workflow.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowDiagram
                  steps={workflow.steps}
                  currentStepName={ticket.status} // highlight based on current ticket status
                />
              </CardContent>
            </Card>
          )}

          {/* Activity log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="relative pl-10 sm:pl-12">
                  {/* Vertical line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-700"></div>

                  <ul className="space-y-6">
                    {timeline.map((item, index) => {
                      let Icon, colorClasses;
                      if (item.type === "comment") {
                        Icon = MessageSquare;
                        colorClasses = "bg-green-600 dark:bg-green-500";
                      } else if (item.type === "status_change") {
                        Icon = RefreshCw;
                        colorClasses = "bg-blue-600 dark:bg-blue-500";
                      } else if (item.fieldName === "tags_added") {
                        Icon = Tag;
                        colorClasses = "bg-purple-600 dark:bg-purple-500";
                      } else if (item.fieldName === "tags_removed") {
                        Icon = MinusCircle; 
                        colorClasses = "bg-red-600 dark:bg-red-500";
                      } else {
                        Icon = Edit3;
                        colorClasses = "bg-orange-600 dark:bg-orange-500";
                      }

                      return (
                        <li key={index} className="relative">
                          {/* Timeline node (perfectly centered) */}
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow ring-4 ring-white dark:ring-gray-900 ${colorClasses}`}
                          >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">Timeline item</span>
                          </span>

                          {/* Card */}
                          <div className="ml-14">
                            <div className="rounded-xl shadow-sm bg-white dark:bg-gray-800 p-4">
                              {item.type === "comment" ? (
                                <>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      {item.author} commented
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatTimestamp(item.timestamp)}
                                    </p>
                                  </div>
                                  <p className="mt-2 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                                    {item.text}
                                  </p>
                                </>
                              ) : item.type === "status_change" ? (
                                <div>
                                  <p className="text-sm text-gray-900 dark:text-gray-100">
                                    Status changed from <b>{item.oldValue || "N/A"}</b> to{" "}
                                    <b>{item.newValue || "N/A"}</b>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    by {item.changedBy} on {formatTimestamp(item.timestamp)}
                                  </p>
                                </div>
                              ) : item.fieldName === "tags_added" ? (
                                <div>
                                  <p className="text-sm text-gray-900 dark:text-gray-100">
                                    Added tag: <b>{item.newValue}</b>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    by {item.changedBy} on {formatTimestamp(item.timestamp)}
                                  </p>
                                </div>
                              ) : item.fieldName === "tags_removed" ? (
                                <div>
                                  <p className="text-sm text-gray-900 dark:text-gray-100">
                                    Removed tag: <b>{item.oldValue}</b>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    by {item.changedBy} on {formatTimestamp(item.timestamp)}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-gray-900 dark:text-gray-100">
                                    Changed {formatFieldName(item.fieldName)} from{" "}
                                    <b>{item.oldValue || "N/A"}</b> to <b>{item.newValue || "N/A"}</b>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    by {item.changedBy} on {formatTimestamp(item.timestamp)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  No activity found for this ticket.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side details */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-xl">Ticket Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium">Priority</label>
                <Badge variant={getPriorityVariant(ticket.priority)}>{ticket.priority}</Badge></div>
              <div><label className="text-sm font-medium">Workgroup</label><div>{ticket.workGroup}</div></div>
              <div><label className="text-sm font-medium">Responsible</label><div>{ticket.responsible}</div></div>
              <div><label className="text-sm font-medium">Module</label><div>{ticket.module}</div></div>
              <div><label className="text-sm font-medium">Start Date</label><div>{ticket.startDate || 'N/A'}</div></div>
              <div><label className="text-sm font-medium">Due Date</label><div>{ticket.dueDate || 'N/A'}</div></div>
            </CardContent>
          </Card>

          {/* NEW SECTION: Display and download attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-xl">Attachments</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ticket.attachments.map((file, index) => {
                    const isImage = file.type.startsWith('image/');
                    return (
                      <li key={index} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          {isImage && (
                            <img src={file.data} alt="Attachment preview" className="w-10 h-10 object-cover rounded-md" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={file.data}
                            download={file.name}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Download
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Ticket Modal */}
      <CancelTicketModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelTicket}
        isLoading={isCancelling}
      />
    </div>
  )
}

export default ViewTicket