import { memo, useMemo } from 'react'
import ReactFlow, { Background } from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '../Card'
import TicketEditor from './TicketEditor'

const NODE_TYPES = {}
const EDGE_TYPES = {}

if (typeof window !== 'undefined' && !window.__liteboardResizeObserverPatched) {
  window.__liteboardResizeObserverPatched = true

  const errorHandler = (event) => {
    if (
      event?.message?.includes('ResizeObserver loop') ||
      event?.message?.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      event.stopImmediatePropagation()
    }
  }

  window.addEventListener('error', errorHandler)

  const originalConsoleError = window.console.error
  window.console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver loop')) return
    originalConsoleError(...args)
  }
}

const WorkflowDiagram = memo(function WorkflowDiagram({
  steps = [],
  currentStepName = '',
  selectedStepName = '',
}) {
  const nodes = useMemo(() => {
    return (steps || []).map((step, i) => {
      const stepName = step.stepName || step.step_name || step.name || ''
      const isCurrent = stepName === currentStepName
      const isSelected = stepName === selectedStepName
      const isDifferent = selectedStepName && currentStepName !== selectedStepName

      let border
      let background
      let color
      let boxShadow
      let label

      if (isCurrent && !isDifferent) {
        border = '2px solid var(--current-color)'
        background = 'var(--current-bg)'
        color = 'var(--current-text)'
        boxShadow = '0 0 12px var(--current-shadow)'
        label = `${stepName}\n(Current)`
      } else if (isSelected) {
        border = '2px solid var(--selected-color)'
        background = 'var(--selected-bg)'
        color = 'var(--selected-text)'
        boxShadow = '0 0 12px var(--selected-shadow)'
        label = isDifferent ? `${stepName}\n(Selected)` : stepName
      } else {
        border = '1px solid var(--border-color)'
        background = 'var(--node-bg)'
        color = 'var(--text-color)'
        boxShadow = 'none'
        label = stepName
      }

      return {
        id: `step-${i}`,
        position: { x: i * 200, y: 0 },
        data: { label },
        style: {
          border,
          borderRadius: '8px',
          padding: '10px',
          background,
          color,
          fontSize: '12px',
          fontWeight: isCurrent || isSelected ? 'bold' : 'normal',
          boxShadow,
          whiteSpace: 'pre-line',
          textAlign: 'center',
        },
        sourcePosition: 'right',
        targetPosition: 'left',
      }
    })
  }, [steps, currentStepName, selectedStepName])

  const edges = useMemo(() => {
    return (steps || []).slice(0, -1).map((_, i) => ({
      id: `edge-${i}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      type: 'smoothstep',
      style: { stroke: 'var(--edge-color)' },
    }))
  }, [steps])

  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        No workflow steps defined
      </div>
    )
  }

  return (
    <div
      style={{
        height: 200,
        '--current-color': '#3b82f6',
        '--current-bg': '#93c5fd',
        '--current-text': '#1e3a8a',
        '--current-shadow': 'rgba(59,130,246,0.5)',
        '--selected-color': '#10b981',
        '--selected-bg': '#6ee7b7',
        '--selected-text': '#065f46',
        '--selected-shadow': 'rgba(16,185,129,0.5)',
        '--node-bg': '#ffffff',
        '--border-color': '#d1d5db',
        '--text-color': '#111827',
        '--edge-color': '#9ca3af',
      }}
      className="border border-gray-300 rounded-md overflow-hidden dark:border-gray-600"
    >
      <style>{`
        .dark [style*="--current-bg"] {
          --current-color: #60a5fa !important;
          --current-bg: #1e40af !important;
          --current-text: #dbeafe !important;
          --current-shadow: rgba(96,165,250,0.6) !important;
        }
        .dark [style*="--selected-bg"] {
          --selected-color: #34d399 !important;
          --selected-bg: #047857 !important;
          --selected-text: #d1fae5 !important;
          --selected-shadow: rgba(52,211,153,0.6) !important;
        }
        .dark [style*="--node-bg"] {
          --node-bg: #1f2937 !important;
          --border-color: #374151 !important;
          --text-color: #f9fafb !important;
          --edge-color: #6b7280 !important;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  )
})

const TicketDetailsForm = ({
  formData,
  handleInputChange,
  handleTagToggle,
  tags = [],
  statusOptions = [],
  priorityOptions = [],
  loadingSteps = false,
  workflow = null,
  ticket = null,
}) => {
  const currentStepLabel = ticket?.current_step_name || ticket?.status || ''

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-gray-800 shadow-sm rounded-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <TicketEditor
              value={formData.description}
              onChange={(html) =>
                handleInputChange({
                  target: {
                    name: 'description',
                    value: html,
                  },
                })
              }
              placeholder="Describe the ticket details..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.stepCode}
                onChange={handleInputChange}
                disabled={loadingSteps}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSteps ? (
                  <option>Loading steps...</option>
                ) : statusOptions.length === 0 ? (
                  <option>No transitions available</option>
                ) : (
                  statusOptions.map((option, index) => (
                    <option
                      key={option.value || index}
                      value={option.value || option.step_code || option}
                    >
                      {option.label || option.step_name || option.stepName || option}
                    </option>
                  ))
                )}
              </select>
              {statusOptions.length > 1 && !loadingSteps && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only valid workflow transitions are shown
                </p>
              )}
              {statusOptions.length === 1 && !loadingSteps && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  No further transitions available from current status
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {workflow && (
            <div className="mt-6 p-4 bg-gradient-to-br dark:from-gray-700 dark:to-gray-750 rounded-lg border border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Workflow: {workflow.name}
                </h4>
              </div>
              <WorkflowDiagram
                steps={workflow.steps}
                currentStepName={currentStepLabel}
                selectedStepName={formData.status}
              />
              {formData.status !== currentStepLabel && (
                <p className="text-xs text-gray-600 dark:text-blue-400 mt-2 font-medium">
                  ⓘ Preview: Status will change from "{currentStepLabel}" to "{formData.status}" when you save
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 shadow-sm rounded-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No tags available</p>
            ) : (
              tags.map((tag) => {
                const isSelected = formData.tags.some((t) => (t.name || t.label || t) === tag.label)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.label)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors shadow-sm ${
                      isSelected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag.label}
                  </button>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TicketDetailsForm
