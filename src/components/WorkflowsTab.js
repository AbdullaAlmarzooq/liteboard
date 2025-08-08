import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const WorkflowsTab = ({ workflows, workgroups, onEdit, onDelete, onCreateClick }) => {
  if (workflows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No workflows found.</p>
        <button
          onClick={onCreateClick}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
        >
          <Plus size={20} />
          <span>Create New Workflow</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {workflows.map(workflow => (
        <div key={workflow.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg">{workflow.name}</h3>
              <span className="text-sm font-medium text-gray-500">{workflow.id}</span>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => onEdit(workflow)} className="text-blue-600 hover:text-blue-800">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete(workflow.id)} className="text-red-600 hover:text-red-800">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">Steps: {workflow.steps.length}</p>
          <div className="mt-4">
            <h4 className="text-sm font-semibold">Steps:</h4>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              {workflow.steps.map((step, index) => {
                const workgroup = workgroups.find(wg => wg.id === step.workgroupCode);
                return (
                  <li key={index}>
                    <span className="font-medium">{step.stepName}</span> - Assigned to: {workgroup ? workgroup.name : 'Unknown'}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkflowsTab;