// WorkflowsTab.js
import React, { useState, useEffect } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import CreateWorkflowModal from './CreateWorkflowModal';
import ConfirmationModal from './ConfirmationModal';
import fetchWithAuth from '../../utils/fetchWithAuth';

const WORKFLOW_LIST_ENDPOINT = 'http://localhost:8000/api/workflow_management/list';

const getWorkflowStepCount = (workflow) =>
  Number.parseInt(
    workflow?.step_count ?? workflow?.stepCount ?? workflow?.steps?.length ?? 0,
    10
  ) || 0;

const WorkflowsTab = ({ workflows: initialWorkflows, workgroups, onEdit: parentOnEdit }) => {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [modalOpen, setModalOpen] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState(null);
  const [workflowToggleTarget, setWorkflowToggleTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLoadingWorkflowDetail, setIsLoadingWorkflowDetail] = useState(false);

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
      const res = await fetchWithAuth(WORKFLOW_LIST_ENDPOINT);
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

  const handleEditClick = async (workflow) => {
    setIsLoadingWorkflowDetail(true);
    setWorkflowToEdit(workflow);
    setModalOpen(true);

    try {
      const res = await fetchWithAuth(`http://localhost:8000/api/workflow_management/${workflow.id}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.detail || errorBody.error || 'Failed to load workflow details');
      }

      const detailedWorkflow = await res.json();
      setWorkflowToEdit(detailedWorkflow);
    } catch (err) {
      console.error('Failed to load workflow details:', err);
      showToast(err.message || 'Failed to load workflow details', 'error');
      setModalOpen(false);
      setWorkflowToEdit(null);
    } finally {
      setIsLoadingWorkflowDetail(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setWorkflowToEdit(null);
    setIsLoadingWorkflowDetail(false);
  };

  const handleSaveWorkflow = async (workflow) => {
    try {
      if (!workflow?.name || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        showToast('Workflow name and steps are required', 'error');
        return;
      }

      const payload = {
        name: workflow.name,
        slaEnabled: Boolean(workflow.slaEnabled ?? workflow.sla_enabled),
        steps: workflow.steps.map(step => ({
          stepName: step.stepName || step.step_name,
          stepCode: step.stepCode || step.step_code,
          categoryCode: normalizeCategoryCode(step.categoryCode ?? step.category_code),
          slaDays: step.slaDays ?? step.sla_days ?? null,
          workgroupCode: step.workgroupCode || step.workgroup_code,
          allowedNextSteps: step.allowedNextSteps || [],
          allowedPreviousSteps: step.allowedPreviousSteps || []
        }))
      };

      if (!workflow.id) {
        const res = await fetchWithAuth('http://localhost:8000/api/workflow_management', {
          method: 'POST',
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
        const res = await fetchWithAuth(`http://localhost:8000/api/workflow_management/${workflow.id}`, {
          method: 'PATCH',
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

  const confirmToggleActive = async () => {
    const workflow = workflowToggleTarget;
    if (!workflow) return;
    const nextActive = !workflow.active;
    try {
      const res = await fetchWithAuth(`http://localhost:8000/api/workflow_management/${workflow.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active: nextActive })
      });
      console.log('[Workflows] toggle active payload:', { id: workflow.id, active: nextActive });
      console.log('[Workflows] toggle active response status:', res.status);
      if (!res.ok) throw new Error('Failed to toggle workflow');
      setWorkflows(prev =>
        prev.map(wf => (wf.id === workflow.id ? { ...wf, active: nextActive } : wf))
      );
      setWorkflowToggleTarget(null);
      showToast(nextActive ? 'Workflow activated successfully' : 'Workflow deactivated successfully');
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
                onClick={() => setWorkflowToggleTarget(workflow)}
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

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Steps: {getWorkflowStepCount(workflow)}
          </p>
        </div>
      ))}

      {modalOpen && (
        isLoadingWorkflowDetail ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Loading Workflow
                </h3>
                <button
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Fetching workflow steps and transitions...
              </p>
            </div>
          </div>
        ) : (
          <CreateWorkflowModal
            workflowToEdit={workflowToEdit}
            onClose={handleModalClose}
            onSave={handleSaveWorkflow}
            workgroups={workgroups}
          />
        )
      )}

      <ConfirmationModal
        isOpen={!!workflowToggleTarget}
        onClose={() => setWorkflowToggleTarget(null)}
        onConfirm={confirmToggleActive}
        title={workflowToggleTarget?.active ? 'Deactivate Workflow' : 'Activate Workflow'}
        message={
          workflowToggleTarget
            ? `Are you sure you want to ${workflowToggleTarget.active ? 'deactivate' : 'activate'} "${workflowToggleTarget.name}"?`
            : ''
        }
        confirmLabel={workflowToggleTarget?.active ? 'Deactivate' : 'Activate'}
        confirmVariant={workflowToggleTarget?.active ? 'danger' : 'primary'}
      />

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
