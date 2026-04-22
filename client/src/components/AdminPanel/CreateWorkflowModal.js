// CreateWorkflowModal.js - CORRECTED VERSION
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Info } from 'lucide-react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { WORKFLOW_CATEGORIES } from '../../constants/statuses';
import fetchWithAuth from '../../utils/fetchWithAuth';

const isTerminalCategoryCode = (categoryCode) =>
  Number(categoryCode) === 30 || Number(categoryCode) === 40;

const WorkflowPreview = ({ steps, getCategoryName }) => {
  const safeSteps = Array.isArray(steps) ? steps : [];
  const isDark = document.documentElement.classList.contains('dark');

  const nodes = useMemo(
    () =>
      safeSteps.map((step, index) => ({
        id: step.stepCode || step.stepName || `step-${index}`,
        position: { x: index * 220, y: 50 },
        data: {
          label: (
            <div className="text-center">
              <div className="font-medium">{step.stepName || 'Unnamed Step'}</div>
              <div className="mt-1 text-[11px] opacity-80">
                {getCategoryName(step.categoryCode)}
              </div>
              {step.slaDays && (
                <div className="mt-1 text-[11px] opacity-80">
                  SLA: {step.slaDays} day{Number(step.slaDays) === 1 ? '' : 's'}
                </div>
              )}
            </div>
          ),
        },
        style: {
          border: '1px solid #777',
          borderRadius: '8px',
          padding: '10px',
          background: isDark ? '#1f2937' : '#fff',
          color: isDark ? '#fff' : '#000',
          fontSize: '12px',
          minWidth: '140px',
        },
        sourcePosition: 'right',
        targetPosition: 'left',
      })),
    [safeSteps, isDark, getCategoryName]
  );

  const edges = useMemo(() => {
    const edgesList = [];
    const seen = new Set();

    safeSteps.forEach((step, index) => {
      const sourceId = step.stepCode || step.stepName || `step-${index}`;
      const allowedNextSteps = Array.isArray(step.allowedNextSteps) ? step.allowedNextSteps : [];

      allowedNextSteps.forEach((nextStepName) => {
        const targetIndex = safeSteps.findIndex((candidate) => candidate.stepName === nextStepName);
        if (targetIndex === -1) return;

        const targetStep = safeSteps[targetIndex];
        const targetId = targetStep.stepCode || targetStep.stepName || `step-${targetIndex}`;
        const edgeKey = `${sourceId}->${targetId}`;
        if (seen.has(edgeKey)) return;

        seen.add(edgeKey);
        edgesList.push({
          id: edgeKey,
          source: sourceId,
          target: targetId,
          type: 'smoothstep',
          animated: false,
        });
      });
    });

    return edgesList;
  }, [safeSteps]);

  if (!safeSteps.length) {
    return null;
  }

  return (
    <div
      style={{ height: 240 }}
      className="mb-6 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden"
    >
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

const CreateWorkflowModal = ({ workflowToEdit, onClose, onSave, workgroups }) => {
  const normalizeCategoryCode = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (parsed === 90) return 40; // backward compatibility for old data
    if ([10, 20, 30, 40].includes(parsed)) return parsed;
    return 10;
  };

  const [form, setForm] = useState({
    id: null,
    name: '',
    slaEnabled: false,
    steps: [
      {
        stepName: 'Open',
        categoryCode: 10,
        slaDays: '',
        workgroupCode: '',
        allowedNextSteps: [],
        allowedPreviousSteps: []
      }
    ],
  });

  const mapWorkflowToForm = (workflow) => ({
    id: workflow.id,
    name: workflow.name,
    slaEnabled: Boolean(workflow.sla_enabled ?? workflow.slaEnabled),
    steps: (workflow.steps || []).map(step => ({
      stepCode: step.step_code || step.stepCode,
      stepName: step.step_name || step.stepName,
      categoryCode: normalizeCategoryCode(step.category_code ?? step.categoryCode),
      slaDays: step.sla_days ?? step.slaDays ?? '',
      workgroupCode: step.workgroup_code || step.workgroupCode,
      allowedNextSteps: step.allowedNextSteps || [],
      allowedPreviousSteps: step.allowedPreviousSteps || []
    }))
  });

  useEffect(() => {
    if (!workflowToEdit?.id) return;

    let cancelled = false;
    const hasDetailedSteps = Array.isArray(workflowToEdit.steps) && workflowToEdit.steps.length > 0;

    if (hasDetailedSteps) {
      setForm(mapWorkflowToForm(workflowToEdit));
      return undefined;
    }

    // Show current row data immediately, then refresh from DB.
    setForm({
      id: workflowToEdit.id,
      name: workflowToEdit.name || '',
      slaEnabled: Boolean(workflowToEdit.sla_enabled ?? workflowToEdit.slaEnabled),
      steps: []
    });

    const loadLatestWorkflow = async () => {
      try {
        const res = await fetchWithAuth(`http://localhost:8000/api/workflow_management/${workflowToEdit.id}`);
        if (!res.ok) throw new Error('Failed to fetch workflow');
        const latest = await res.json();
        if (!cancelled) {
          setForm(mapWorkflowToForm(latest));
        }
      } catch (err) {
        // Keep already-set local workflow values as fallback.
      }
    };

    loadLatestWorkflow();

    return () => {
      cancelled = true;
    };
  }, [workflowToEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'slaEnabled') {
      setForm((prev) => ({
        ...prev,
        slaEnabled: checked,
        steps: checked
          ? prev.steps
          : prev.steps.map((step) => ({ ...step, slaDays: '' })),
      }));
      return;
    }

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
            const normalizedCategory = normalizeCategoryCode(value);
            updatedStep[name] = normalizedCategory;
            if (isTerminalCategoryCode(normalizedCategory)) {
              updatedStep.slaDays = '';
            }
          } else if (name === 'slaDays') {
            updatedStep.slaDays = String(value || '').replace(/[^\d]/g, '');
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
          slaDays: '',
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

    for (const step of form.steps) {
      const terminal = isTerminalCategoryCode(step.categoryCode);
      const parsedSlaDays =
        step.slaDays === '' || step.slaDays === null || step.slaDays === undefined
          ? null
          : Number.parseInt(step.slaDays, 10);

      if (terminal && parsedSlaDays !== null) {
        alert(`Closed/Cancelled step "${step.stepName}" cannot have SLA days.`);
        return;
      }

      if (form.slaEnabled && !terminal) {
        if (!Number.isInteger(parsedSlaDays)) {
          alert(`SLA days are required for "${step.stepName}" when SLA is enabled.`);
          return;
        }

        if (parsedSlaDays < 1 || parsedSlaDays > 99) {
          alert(`SLA days for "${step.stepName}" must be between 1 and 99.`);
          return;
        }
      }
    }

    const normalizedSteps = form.steps.map((step) => {
      const terminal = isTerminalCategoryCode(step.categoryCode);
      return {
        ...step,
        slaDays:
          form.slaEnabled && !terminal && step.slaDays !== ''
            ? String(Number.parseInt(step.slaDays, 10))
            : '',
      };
    });

    onSave({
      ...form,
      steps: normalizedSteps,
    });
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
                <li>Steps with Cancelled category automatically allow transitions from all steps</li>
                <li>Enable SLA only when all active (non-Closed/Cancelled) steps have SLA days</li>
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

          <div className="mb-6">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="slaEnabled"
                checked={form.slaEnabled}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                SLA Enabled
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              When enabled, due dates are system-calculated from step SLA days.
            </p>
          </div>

          {form.steps.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                  Workflow Preview
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Live preview from current steps and transitions
                </span>
              </div>
              <WorkflowPreview steps={form.steps} getCategoryName={getCategoryName} />
            </div>
          )}

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
                      {step.categoryCode === 40 && (
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

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 ${
                      form.slaEnabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                    } gap-4`}
                  >
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

                    {/* SLA Days */}
                    {form.slaEnabled && !isTerminalCategoryCode(step.categoryCode) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          SLA Days *
                        </label>
                        <input
                          type="number"
                          name="slaDays"
                          min="1"
                          max="99"
                          inputMode="numeric"
                          value={step.slaDays ?? ''}
                          onChange={(e) => handleStepChange(index, e)}
                          placeholder="1-99"
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                    )}

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
                  {step.categoryCode === 40 && (
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
