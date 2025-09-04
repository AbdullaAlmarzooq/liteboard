// CreateWorkflowModal.js
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { WORKFLOW_CATEGORIES } from '../../constants/statuses';

const CreateWorkflowModal = ({ workflowToEdit, onClose, onSave, workgroups }) => {
  const [form, setForm] = useState({
    name: '',
    steps: [{ stepName: 'Open', categoryCode: 10, workgroupCode: '' }],
  });

  useEffect(() => {
    if (workflowToEdit) {
      setForm(workflowToEdit);
    }
  }, [workflowToEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleStepChange = (index, e) => {
    const { name, value } = e.target;
    const newSteps = form.steps.map((step, i) => {
      if (i === index) {
        return { ...step, [name]: value, order: i + 1 };
      }
      return step;
    });
    setForm(prev => ({ ...prev, steps: newSteps }));
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [...prev.steps, { stepName: 'New Step', categoryCode: 10, workgroupCode: '' }]
    }));
  };

  const removeStep = (index) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const getTitle = () => workflowToEdit ? `Edit Workflow: ${workflowToEdit.name}` : 'Create New Workflow';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{getTitle()}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {workflowToEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Workflow ID</label>
                <input
                  type="text"
                  value={form.id || ''}
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 text-black dark:text-white"
                  readOnly
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Workflow Name</label>
              <input
                type="text"
                name="name"
                value={form.name || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                placeholder="e.g., IT Support Flow"
              />
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold">Workflow Steps</h4>
                <button
                  onClick={addStep}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} /> <span className="ml-1 text-sm">Add Step</span>
                </button>
              </div>
              <div className="space-y-4">
                {form.steps.map((step, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md shadow-inner flex items-end space-x-4">
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Step {index + 1} Name</label>
                      <input
                        type="text"
                        name="stepName"
                        value={step.stepName}
                        onChange={(e) => handleStepChange(index, e)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                        placeholder="e.g., Open"
                      />
                    </div>
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
                      <select
                        name="categoryCode"
                        value={step.categoryCode}
                        onChange={(e) => handleStepChange(index, e)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                      >
                        {WORKFLOW_CATEGORIES.map(category => (
                          <option key={category.code} value={category.code}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Assigned Workgroup</label>
                      <select
                        name="workgroupCode"
                        value={step.workgroupCode}
                        onChange={(e) => handleStepChange(index, e)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                      >
                        <option value="">Select Workgroup</option>
                        {workgroups.map(wg => (
                          <option key={wg.id} value={wg.id}>{wg.name}</option>
                        ))}
                      </select>
                    </div>
                    {form.steps.length > 1 && (
                      <button onClick={() => removeStep(index)} className="text-red-600 hover:text-red-800 mb-1">
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkflowModal;