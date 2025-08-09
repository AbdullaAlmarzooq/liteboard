import { Card, CardContent, CardHeader, CardTitle } from "./Card"
import Badge from "./Badge"
import Button from "./Button"
import useFetch from "../useFetch"
import { useState, useEffect } from 'react'
import ReactFlow, { Background } from 'reactflow'
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

const ViewTicket = ({ ticketId, setCurrentPage }) => {
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/tickets/${ticketId}`)
  const { data: statusHistory, isPending: isHistoryPending, error: historyError } = useFetch(`http://localhost:8000/status_history?ticketId=${ticketId}`)
  
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

  const getStatusVariant = status => {
    switch (status) {
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
        <Button variant="secondary" onClick={() => setCurrentPage(`edit-ticket-${ticketId}`)}>Edit Ticket</Button>
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
                <ul className="space-y-4">
                  {timeline.map((item, index) => (
                    <li key={index} className="flex items-start space-x-4">
                      <div className={`h-2 w-2 rounded-full mt-2 ${item.type === 'comment' ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div className="flex-1">
                        {item.type === 'comment' ? (
                          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">{item.author} commented:</p>
                              <p className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</p>
                            </div>
                            <p className="mt-2">{item.text}</p>
                          </div>
                        ) : item.type === 'status_change' ? (
                          <div>
                            <p className="text-sm">Status changed from <b>{item.oldValue || 'N/A'}</b> to <b>{item.newValue || 'N/A'}</b></p>
                            <p className="text-xs text-gray-500">by {item.changedBy} on {formatTimestamp(item.timestamp)}</p>
                          </div>
                        ) : item.fieldName === 'tags_added' ? (
                          <div>
                            <p className="text-sm">Added tag: <b>{item.newValue}</b></p>
                            <p className="text-xs text-gray-500">by {item.changedBy} on {formatTimestamp(item.timestamp)}</p>
                          </div>
                        ) : item.fieldName === 'tags_removed' ? (
                          <div>
                            <p className="text-sm">Removed tag: <b>{item.oldValue}</b></p>
                            <p className="text-xs text-gray-500">by {item.changedBy} on {formatTimestamp(item.timestamp)}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm">Changed {formatFieldName(item.fieldName)} from <b>{item.oldValue || 'N/A'}</b> to <b>{item.newValue || 'N/A'}</b></p>
                            <p className="text-xs text-gray-500">by {item.changedBy} on {formatTimestamp(item.timestamp)}</p>
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
        </div>
      </div>
    </div>
  )
}

export default ViewTicket