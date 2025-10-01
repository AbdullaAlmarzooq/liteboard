// CreateWorkflowModal.js
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { WORKFLOW_CATEGORIES } from '../../constants/statuses';

const CreateWorkflowModal = ({ workflowToEdit, onClose, onSave, workgroups }) => {
  const [form, setForm] = useState({
    name: '',
    steps: [
      {
        stepName: 'Open',
        categoryCode: 10,
        workgroupCode: '',
        allowedNext: [],
        cancelAllowed: false,
      },
    ],
  });

  useEffect(() => {
    if (workflowToEdit) {
      // Ensure allowedNext arrays exist
      const stepsWithAllowed = workflowToEdit.steps.map(step => ({
        ...step,
        allowedNext: step.allowedNext || [],
        cancelAllowed: step.cancelAllowed || false,
      }));
      setForm({ ...workflowToEdit, steps: stepsWithAllowed });
    }
  }, [workflowToEdit]);

  const handleWorkflowNameChange = (e) => {
    setForm(prev => ({ ...prev, name: e.target.value }));
  };

  const handleStepChange = (index, newStep) => {
    const newSteps = form.steps.map((step, i) => (i === index ? newStep : step));
    setForm(prev => ({ ...prev, steps: newSteps }));
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepName: 'New Step',
          categoryCode: 10,
          workgroupCode: '',
          allowedNext: [],
          cancelAllowed: false,
        },
      ],
    }));
  };

  const removeStep = (index) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const toggleAllowedNext = (stepIndex, targetStepName) => {
    const step = form.steps[stepIndex];
    const allowedNext = step.allowedNext || [];
    const newAllowed = allowedNext.includes(targetStepName)
      ? allowedNext.filter(name => name !== targetStepName)
      : [...allowedNext, targetStepName];

    handleStepChange(stepIndex, { ...step, allowedNext: newAllowed });
  };

  const handleSave = () => {
    // Send form to parent for backend saving
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {workflowToEdit ? `Edit Workflow: ${workflowToEdit.name}` : 'Create New Workflow'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          {/* Workflow Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Workflow Name</label>
            <input
              type="text"
              value={form.name}
              onChange={handleWorkflowNameChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
              placeholder="Workflow name"
            />
          </div>

          {/* Steps */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-semibold">Workflow Steps</h4>
              <button onClick={addStep} className="flex items-center text-blue-600 hover:text-blue-800">
                <Plus size={16} /> <span className="ml-1 text-sm">Add Step</span>
              </button>
            </div>

            <div className="space-y-4">
              {form.steps.map((step, stepIndex) => (
                <div
                  key={stepIndex}
                  className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md shadow-inner flex flex-col space-y-2"
                >
                  <div className="flex space-x-4 items-end">
                    {/* Step Name */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Step Name</label>
                      <input
                        type="text"
                        value={step.stepName}
                        onChange={(e) => handleStepChange(stepIndex, { ...step, stepName: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                      />
                    </div>

                    {/* Category */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <select
                        value={step.categoryCode}
                        onChange={(e) =>
                          handleStepChange(stepIndex, { ...step, categoryCode: parseInt(e.target.value, 10) })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                      >
                        {WORKFLOW_CATEGORIES.map((cat) => (
                          <option key={cat.code} value={cat.code}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Workgroup */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Assigned Workgroup</label>
                      <select
                        value={step.workgroupCode}
                        onChange={(e) => handleStepChange(stepIndex, { ...step, workgroupCode: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800"
                      >
                        <option value="">Select Workgroup</option>
                        {workgroups.map((wg) => (
                          <option key={wg.id} value={wg.id}>
                            {wg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remove Step */}
                    {form.steps.length > 1 && (
                      <button onClick={() => removeStep(stepIndex)} className="text-red-600 hover:text-red-800 mb-1">
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>

                  {/* Allowed Next Steps */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Allowed Next Steps</label>
                    <div className="flex flex-wrap gap-2">
                      {form.steps
                        .filter((_, idx) => idx !== stepIndex)
                        .map((otherStep, idx) => (
                          <label key={idx} className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-600 p-1 rounded-md">
                            <input
                              type="checkbox"
                              checked={step.allowedNext?.includes(otherStep.stepName) || false}
                              onChange={() => toggleAllowedNext(stepIndex, otherStep.stepName)}
                            />
                            <span className="text-sm">{otherStep.stepName}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Cancel Allowed */}
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="checkbox"
                      checked={step.cancelAllowed || false}
                      onChange={(e) =>
                        handleStepChange(stepIndex, { ...step, cancelAllowed: e.target.checked })
                      }
                    />
                    <span className="text-sm">Can be Cancelled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
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