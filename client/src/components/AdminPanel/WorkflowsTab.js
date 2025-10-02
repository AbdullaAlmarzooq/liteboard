// WorkflowsTab.js
import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { getCategoryByCode } from '../../constants/statuses';
import CreateWorkflowModal from './CreateWorkflowModal';

const WorkflowDiagram = ({ steps }) => {
  if (!steps || steps.length === 0) return null;

  const nodes = steps.map((step, i) => {
    const category = getCategoryByCode(step.categoryCode) || { name: 'Unknown', color: 'bg-gray-400' };
    return {
      id: `step-${i}`,
      position: { x: i * 200, y: 50 },
      data: { label: step.stepName },
      style: {
        border: '1px solid #777',
        borderRadius: '8px',
        padding: '10px',
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
        fontSize: '12px',
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
  }));

  return (
    <div style={{ height: 200 }} className="mt-4 border border-gray-300 dark:border-gray-600 rounded-md">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color={document.documentElement.classList.contains('dark') ? '#555' : '#eee'} />
      </ReactFlow>
    </div>
  );
};

const WorkflowsTab = ({ workflows: initialWorkflows, workgroups, onDelete, onEdit: parentOnEdit }) => {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [modalOpen, setModalOpen] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState(null);

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

  const handleSaveWorkflow = (workflow) => {
    if (!workflow.id) {
      // New workflow: generate temporary id for frontend
      workflow.id = `WF-${workflows.length + 1}`;
      setWorkflows(prev => [...prev, workflow]);
    } else {
      // Existing workflow
      setWorkflows(prev => prev.map(wf => wf.id === workflow.id ? workflow : wf));
    }
    setModalOpen(false);
    setWorkflowToEdit(null);

    // Call parent edit if needed
    parentOnEdit && parentOnEdit(workflow);
  };

  const handleDelete = async (id) => {
    if (onDelete) {
      await onDelete(id); // Parent handles DB deletion
    }
    setWorkflows(prev => prev.filter(wf => wf.id !== id));
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
      {workflows.map(workflow => (
        <div key={workflow.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg">{workflow.name}</h3>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{workflow.id}</span>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => handleEditClick(workflow)} className="text-blue-600 hover:text-blue-800">
                <Edit2 size={16} />
              </button>
              <button onClick={() => handleDelete(workflow.id)} className="text-red-600 hover:text-red-800">
                <Trash2 size={16} />
              </button>
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
