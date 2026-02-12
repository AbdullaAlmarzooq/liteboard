// WorkflowsTab.js
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import CreateWorkflowModal from './CreateWorkflowModal';

const WorkflowDiagram = ({ steps }) => {
  const safeSteps = Array.isArray(steps) ? steps : [];

  const isDark = document.documentElement.classList.contains('dark');

  const nodes = useMemo(() => safeSteps.map((step, i) => {
    const stepLabel = step.stepName || step.step_name || 'Unnamed';
    return {
      id: `step-${i}`,
      position: { x: i * 200, y: 50 },
      data: { label: stepLabel },
      style: {
        border: '1px solid #777',
        borderRadius: '8px',
        padding: '10px',
        background: isDark ? '#1f2937' : '#fff',
        color: isDark ? '#fff' : '#000',
        fontSize: '12px',
      },
      sourcePosition: 'right',
      targetPosition: 'left',
    };
  }), [safeSteps, isDark]);

  const edges = useMemo(() => safeSteps.slice(0, -1).map((_, i) => ({
    id: `edge-${i}`,
    source: `step-${i}`,
    target: `step-${i + 1}`,
    type: 'smoothstep',
  })), [safeSteps]);

  if (safeSteps.length === 0) return null;

  return (
    <div style={{ height: 200 }} className="mt-4 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background color={isDark ? '#555' : '#eee'} />
      </ReactFlow>
    </div>
  );
};

const WorkflowsTab = ({ workflows: initialWorkflows, workgroups, onEdit: parentOnEdit }) => {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [modalOpen, setModalOpen] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setWorkflows(initialWorkflows);
  }, [initialWorkflows]);

  useEffect(() => {
    // Prevent CRA dev overlay from crashing the tab on known ReactFlow ResizeObserver noise.
    const suppressResizeObserverError = (event) => {
      if (
        event?.message?.includes('ResizeObserver loop') ||
        event?.message?.includes('ResizeObserver loop completed with undelivered notifications')
      ) {
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', suppressResizeObserverError);
    return () => window.removeEventListener('error', suppressResizeObserverError);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const normalizeCategoryCode = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (parsed === 90) return 40; // backward compatibility for old payloads
    if ([10, 20, 30, 40].includes(parsed)) return parsed;
    return 10;
  };

  const refreshWorkflows = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/workflow_management');
      if (!res.ok) throw new Error('Failed to refresh workflows');
      const data = await res.json();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to refresh workflows:', err);
    }
  };

  const handleCreateClick = () => {
    setWorkflowToEdit(null); // Creating new
    setModalOpen(true);
  };

  const handleEditClick = (workflow) => {
    setWorkflowToEdit(workflow);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setWorkflowToEdit(null);
  };

  const handleSaveWorkflow = async (workflow) => {
    try {
      if (!workflow?.name || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        showToast('Workflow name and steps are required', 'error');
        return;
      }

      const payload = {
        name: workflow.name,
        steps: workflow.steps.map(step => ({
          stepName: step.stepName || step.step_name,
          stepCode: step.stepCode || step.step_code,
          categoryCode: normalizeCategoryCode(step.categoryCode ?? step.category_code),
          workgroupCode: step.workgroupCode || step.workgroup_code,
          allowedNextSteps: step.allowedNextSteps || [],
          allowedPreviousSteps: step.allowedPreviousSteps || []
        }))
      };

      if (!workflow.id) {
        const res = await fetch('http://localhost:8000/api/workflow_management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log('[Workflows] create response status:', res.status);
        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          throw new Error(errorBody.detail || errorBody.error || 'Failed to create workflow');
        }
        setModalOpen(false);
        setWorkflowToEdit(null);
        showToast('Workflow created successfully');
      } else {
        const res = await fetch(`http://localhost:8000/api/workflow_management/${workflow.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: workflow.id, ...payload })
        });
        console.log('[Workflows] update response status:', res.status);
        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          throw new Error(errorBody.detail || errorBody.error || 'Failed to update workflow');
        }
        setModalOpen(false);
        setWorkflowToEdit(null);
        showToast('Workflow updated successfully');
      }

      await refreshWorkflows();
      parentOnEdit && parentOnEdit(workflow);
    } catch (err) {
      console.error('Failed to save workflow:', err);
      showToast(err.message || 'Failed to save workflow', 'error');
    }
  };

  const handleToggleActive = async (workflow) => {
    if (!workflow) return;
    const nextActive = !workflow.active;
    try {
      const res = await fetch(`http://localhost:8000/api/workflow_management/${workflow.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive })
      });
      console.log('[Workflows] toggle active payload:', { id: workflow.id, active: nextActive });
      console.log('[Workflows] toggle active response status:', res.status);
      if (!res.ok) throw new Error('Failed to toggle workflow');
      setWorkflows(prev =>
        prev.map(wf => (wf.id === workflow.id ? { ...wf, active: nextActive } : wf))
      );
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
      showToast('Failed to toggle workflow', 'error');
    }
  };

  if (!workflows.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No workflows found.</p>
        <button
          onClick={handleCreateClick}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
        >
          <Plus size={20} />
          <span>Create New Workflow</span>
        </button>
        {modalOpen && (
          <CreateWorkflowModal
            workflowToEdit={workflowToEdit}
            onClose={handleModalClose}
            onSave={handleSaveWorkflow}
            workgroups={workgroups}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[70] px-4 py-2 rounded-md text-sm shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}
        >
          {toast.message}
        </div>
      )}
      {workflows.map(workflow => (
        <div key={workflow.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg">{workflow.name}</h3>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => handleEditClick(workflow)} className="text-blue-600 hover:text-blue-800">
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleToggleActive(workflow)}
                className="relative inline-flex items-center h-6 w-12 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{
                  backgroundColor: workflow.active ? '#2563eb' : '#e5e7eb',
                  cursor: workflow.active ? 'pointer' : 'not-allowed'
                }}
                title={workflow.active ? 'Set inactive' : 'Set active'}
                aria-label={workflow.active ? 'Active' : 'Inactive'}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                  style={{ transform: workflow.active ? 'translateX(1.6rem)' : 'translateX(0.1rem)' }}
                />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {workflow.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">Steps: {workflow.steps.length}</p>
          <WorkflowDiagram steps={workflow.steps} />
        </div>
      ))}

      {modalOpen && (
        <CreateWorkflowModal
          workflowToEdit={workflowToEdit}
          onClose={handleModalClose}
          onSave={handleSaveWorkflow}
          workgroups={workgroups}
        />
      )}

      <div className="mt-4">
        <button
          onClick={handleCreateClick}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add New Workflow</span>
        </button>
      </div>
    </div>
  );
};

export default WorkflowsTab;
