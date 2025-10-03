// CreateWorkflowModal.js - CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Info } from 'lucide-react';
import { WORKFLOW_CATEGORIES } from '../../constants/statuses';

const CreateWorkflowModal = ({ workflowToEdit, onClose, onSave, workgroups }) => {
  const [form, setForm] = useState({
    id: null,
    name: '',
    steps: [
      {
        stepName: 'Open',
        categoryCode: 10,
        workgroupCode: '',
        allowedNextSteps: [],
        allowedPreviousSteps: []
      }
    ],
  });

  useEffect(() => {
    if (workflowToEdit) {
      setForm({
        id: workflowToEdit.id,
        name: workflowToEdit.name,
        steps: workflowToEdit.steps.map(step => ({
          stepCode: step.step_code || step.stepCode,
          stepName: step.step_name || step.stepName,
          categoryCode: step.category_code || step.categoryCode,
          workgroupCode: step.workgroup_code || step.workgroupCode,
          allowedNextSteps: step.allowedNextSteps || [],
          allowedPreviousSteps: step.allowedPreviousSteps || []
        }))
      });
    }
  }, [workflowToEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleStepChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => {
      const stepsCopy = prev.steps.map((step, i) => {
        if (i === index) {
          let updatedStep = { ...step };
          
          if (type === 'checkbox') {
            if (name === 'allowedNextSteps' || name === 'allowedPreviousSteps') {
              if (checked) {
                updatedStep[name] = [...updatedStep[name], value];
              } else {
                updatedStep[name] = updatedStep[name].filter(v => v !== value);
              }
            }
          } else if (name === 'categoryCode') {
            updatedStep[name] = parseInt(value);
          } else {
            updatedStep[name] = value;
          }
          
          return updatedStep;
        }
        return step;
      });
      return { ...prev, steps: stepsCopy };
    });
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepName: `Step ${prev.steps.length + 1}`,
          categoryCode: 10,
          workgroupCode: '',
          allowedNextSteps: [],
          allowedPreviousSteps: []
        }
      ]
    }));
  };

  const removeStep = (index) => {
    if (form.steps.length === 1) {
      alert('Workflow must have at least one step');
      return;
    }

    const stepToRemove = form.steps[index];
    
    setForm(prev => {
      // Remove the step
      const updatedSteps = prev.steps.filter((_, i) => i !== index);
      
      // Remove references to this step in other steps' transitions
      const cleanedSteps = updatedSteps.map(step => ({
        ...step,
        allowedNextSteps: step.allowedNextSteps.filter(s => s !== stepToRemove.stepName),
        allowedPreviousSteps: step.allowedPreviousSteps.filter(s => s !== stepToRemove.stepName)
      }));
      
      return { ...prev, steps: cleanedSteps };
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('Workflow name is required');
      return;
    }

    if (form.steps.length === 0) {
      alert('Workflow must have at least one step');
      return;
    }

    // Validate step names are unique
    const stepNames = form.steps.map(s => s.stepName);
    const uniqueNames = new Set(stepNames);
    if (stepNames.length !== uniqueNames.size) {
      alert('Step names must be unique');
      return;
    }

    onSave(form);
  };

  const getCategoryName = (code) => {
    const category = WORKFLOW_CATEGORIES.find(c => c.code === code);
    return category ? category.name : 'Unknown';
  };

  const getTitle = () => workflowToEdit ? `Edit Workflow: ${workflowToEdit.name}` : 'Create New Workflow';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getTitle()}</h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start">
            <Info size={20} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">How to create a workflow:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Define all steps in your workflow</li>
                <li>For each step, select which steps it can transition to (forward/backward)</li>
                <li>Steps with Cancel category (90) automatically allow transitions from all steps</li>
              </ol>
            </div>
          </div>

          {/* Workflow Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Workflow Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="e.g., IT Support Workflow, HR Onboarding Process"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Workflow Steps */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white">Workflow Steps</h4>
              <button 
                onClick={addStep} 
                className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Plus size={16} /> <span className="ml-1 text-sm">Add Step</span>
              </button>
            </div>

            <div className="space-y-4">
              {form.steps.map((step, index) => (
                <div 
                  key={index} 
                  className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Step {index + 1}
                      </span>
                      {step.categoryCode === 90 && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                          Cancel Step
                        </span>
                      )}
                    </div>
                    {form.steps.length > 1 && (
                      <button 
                        onClick={() => removeStep(index)} 
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Remove step"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Step Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Step Name *
                      </label>
                      <input
                        type="text"
                        name="stepName"
                        value={step.stepName}
                        onChange={(e) => handleStepChange(index, e)}
                        placeholder="e.g., Open, In Progress"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Category *
                      </label>
                      <select
                        name="categoryCode"
                        value={step.categoryCode}
                        onChange={(e) => handleStepChange(index, e)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        {WORKFLOW_CATEGORIES.map(category => (
                          <option key={category.code} value={category.code}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Workgroup */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Workgroup
                      </label>
                      <select
                        name="workgroupCode"
                        value={step.workgroupCode || ''}
                        onChange={(e) => handleStepChange(index, e)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">None</option>
                        {workgroups?.map(wg => (
                          <option key={wg.id} value={wg.id}>{wg.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Allowed Next Steps */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Can Move To
                      </label>
                      <div className="flex flex-col max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                        {form.steps.filter((_, i) => i !== index).length === 0 ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Add more steps first</span>
                        ) : (
                          form.steps.map((s, i) => (
                            i !== index && (
                              <label key={i} className="flex items-center text-sm mb-1 hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                                <input
                                  type="checkbox"
                                  name="allowedNextSteps"
                                  value={s.stepName}
                                  checked={step.allowedNextSteps.includes(s.stepName)}
                                  onChange={(e) => handleStepChange(index, e)}
                                  className="mr-2"
                                />
                                <span className="text-gray-900 dark:text-white">{s.stepName}</span>
                              </label>
                            )
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional info for Cancel steps */}
                  {step.categoryCode === 90 && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-400">
                      <strong>Note:</strong> Cancel steps automatically allow transitions from ALL other steps in the workflow.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {workflowToEdit ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkflowModal;