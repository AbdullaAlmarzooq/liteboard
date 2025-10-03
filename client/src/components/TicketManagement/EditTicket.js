// EditTicket.js - INTEGRATED WITH WORKFLOW APIs
import { useState, useEffect } from 'react';
import useFetch from "../../useFetch";
import Button from "../Button";
import { useParams, useNavigate } from 'react-router-dom';
import TicketDetailsForm from './TicketDetailsForm';
import AssignmentAndTimeline from './AssignmentAndTimeline';
import CommentSection from './CommentSection';
import AttachmentUploader from './AttachmentUploader';

const EditTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/api/tickets/${ticketId}`);
  const { data: employees } = useFetch('http://localhost:8000/api/employees'); 
  const { data: tagsList } = useFetch('http://localhost:8000/api/tags'); 
  const { data: workgroups } = useFetch('http://localhost:8000/api/workgroups');
  const { data: workflows, isPending: workflowsPending } = useFetch('http://localhost:8000/api/workflows');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workflowId: '',
    stepCode: '',
    status: '',
    priority: 'Medium',
    workgroupId: '',
    workGroup: '',
    responsibleEmployeeId: '',
    responsible: '',
    moduleId: '',
    module: '',
    tags: [],
    startDate: '',
    dueDate: '',
  });

  // Comments state
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState(null);

  // Attachments state
  const [savedAttachments, setSavedAttachments] = useState([]);
  const [newAttachments, setNewAttachments] = useState([]);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Workflow status options - NOW FETCHED FROM API
  const [allowedSteps, setAllowedSteps] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  // Populate form when ticket loads
  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title || '',
        description: ticket.description || '',
        workflowId: ticket.workflow_id || ticket.workflowId || '',
        stepCode: ticket.step_code || ticket.stepCode || '',
        status: ticket.status || '',
        priority: ticket.priority || 'Medium',
        workgroupId: ticket.workgroup_id || ticket.workgroupId || '',
        workGroup: ticket.workGroup || '',
        responsibleEmployeeId: ticket.responsible_employee_id || ticket.responsibleEmployeeId || '',
        responsible: ticket.responsible || '',
        moduleId: ticket.module_id || ticket.moduleId || '',
        module: ticket.module || '',
        tags: ticket.tags || [],
        startDate: ticket.start_date || ticket.startDate || '',
        dueDate: ticket.due_date || ticket.dueDate || '',
      });
      setComments(ticket.comments || []);
      setSavedAttachments(ticket.attachments || []);
    }
  }, [ticket]);

  // Fetch allowed next steps from API
  useEffect(() => {
    const fetchAllowedSteps = async () => {
      if (!ticketId) return;
      
      setLoadingSteps(true);
      try {
        const response = await fetch(`http://localhost:8000/api/tickets/${ticketId}/allowed-steps`);
        if (response.ok) {
          const steps = await response.json();
          setAllowedSteps(steps);
        } else {
          console.error('Failed to fetch allowed steps');
          setAllowedSteps([]);
        }
      } catch (err) {
        console.error('Error fetching allowed steps:', err);
        setAllowedSteps([]);
      } finally {
        setLoadingSteps(false);
      }
    };

    fetchAllowedSteps();
  }, [ticketId, formData.stepCode]);

  // Auto-assign workgroup when step changes
  const autoAssignWorkgroup = async (newStepCode) => {
    if (!workflows || !newStepCode) return;

    // Find the new step details
    const allSteps = workflows.flatMap(wf => wf.steps || []);
    const newStep = allSteps.find(s => s.stepCode === newStepCode || s.step_code === newStepCode);

    if (newStep && newStep.workgroupCode) {
      const workgroup = workgroups?.find(wg => wg.id === newStep.workgroupCode);
      
      if (workgroup) {
        // Update workgroup in form
        setFormData(prev => ({
          ...prev,
          workgroupId: workgroup.id,
          workGroup: workgroup.name
        }));

        // Try to auto-assign responsible employee from workgroup
        if (employees && employees.length > 0) {
          const eligibleEmployees = employees.filter(
            emp => emp.workgroupCode === workgroup.id
          );

          if (eligibleEmployees.length > 0) {
            // Assign to first available employee
            const assignee = eligibleEmployees[0];
            setFormData(prev => ({
              ...prev,
              responsibleEmployeeId: assignee.id,
              responsible: assignee.name
            }));
          }
        }
      }
    }
  };

  // Handle status change with workflow transition
  const handleStatusChange = async (newStepCode) => {
    if (!newStepCode || newStepCode === formData.stepCode) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Call the transition endpoint
      const response = await fetch(`http://localhost:8000/api/tickets/${ticketId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_code: newStepCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Invalid transition');
      }

      const result = await response.json();
      
      // Update local state with new status
      setFormData(prev => ({
        ...prev,
        stepCode: newStepCode,
        status: result.ticket?.status || result.ticket?.current_step_name || prev.status
      }));

      // Auto-assign workgroup based on new step
      await autoAssignWorkgroup(newStepCode);

      // Add activity log entry
      await addActivityEntry('status', formData.status, result.ticket?.status || result.ticket?.current_step_name);

    } catch (err) {
      setSubmitError(err.message);
      console.error('Transition error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update formData fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'status') {
      // This is a status change - use transition API
      handleStatusChange(value);
      return;
    }
    
    if (name === 'responsible') {
      const responsibleEmployee = employees?.find(emp => emp.name === value);
      setFormData(prev => ({
        ...prev,
        responsible: value,
        responsibleEmployeeId: responsibleEmployee ? responsibleEmployee.id : '',
      }));
      return;
    }
    
    if (name === 'module') {
      setFormData(prev => ({ ...prev, module: value }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Tag toggle handler
  const handleTagToggle = (tagLabel) => {
    setFormData(prev => {
      const isSelected = prev.tags.some(t => t.name === tagLabel);
      if (isSelected) {
        return { ...prev, tags: prev.tags.filter(t => t.name !== tagLabel) };
      } else {
        const tagObject = tagsList?.find(t => t.label === tagLabel);
        if (tagObject) {
          return {
            ...prev,
            tags: [...prev.tags, { id: tagObject.id, name: tagObject.label, color: tagObject.color }]
          };
        }
        return prev;
      }
    });
  };

  // Attachments
  const handleNewAttachmentsChange = (attachmentsFromUploader) => {
    const validFiles = attachmentsFromUploader.filter(file => file.size <= 1024 * 1024);
    setNewAttachments(validFiles);
  };

  const handleRemoveSavedAttachment = (fileToRemove) => {
    setSavedAttachments(savedAttachments.filter(file => file.id !== fileToRemove.id));
  };

  // Comment handlers
  const handleCommentSubmit = async () => {
    if (!newCommentText.trim()) return;
    setIsAddingComment(true);
    setSubmitError('');
    try {
      const res = await fetch(`http://localhost:8000/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          text: newCommentText,
          author: 'Current User',
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments([...comments, { 
          id: created.id, 
          text: newCommentText, 
          author: 'Current User', 
          timestamp: new Date().toISOString() 
        }]);
        setNewCommentText('');
      } else {
        setSubmitError('Failed to add comment.');
      }
    } catch (err) {
      setSubmitError('Error adding comment.');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleSaveCommentEdit = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editingCommentText }),
      });
      if (res.ok) {
        setComments(comments.map(c => 
          c.id === commentId ? { ...c, text: editingCommentText } : c
        ));
        setEditingCommentId(null);
        setEditingCommentText('');
      }
    } catch {
      setSubmitError('Error updating comment.');
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/comments/${commentToDeleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentToDeleteId));
      }
    } catch {
      setSubmitError('Error deleting comment.');
    } finally {
      setShowDeleteModal(false);
      setCommentToDeleteId(null);
    }
  };

  // Status history entry
  const addActivityEntry = async (fieldName, oldValue, newValue) => {
    try {
      await fetch(`http://localhost:8000/api/status_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          activity_type: fieldName === 'status' ? 'status_change' : 'field_change',
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          changed_by: 'Current User',
        }),
      });
    } catch (err) {
      console.error('Error adding activity entry:', err);
    }
  };

  // Submit main ticket form (for non-status fields)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    const finalAttachments = [...savedAttachments, ...newAttachments];
    
    try {
      // Use PUT endpoint for non-status updates
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: formData.workflowId,
          workgroupId: formData.workgroupId,
          moduleId: formData.moduleId,
          responsibleEmployeeId: formData.responsibleEmployeeId,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          dueDate: formData.dueDate,
          startDate: formData.startDate,
          tags: formData.tags,
          attachments: finalAttachments,
          // Don't send status/step_code here - use transition endpoint
        }),
      });
      
      if (res.ok) {
        setNewAttachments([]);
        navigate(`/view-ticket/${ticketId}`);
      } else {
        const errorData = await res.json();
        setSubmitError(errorData.error || 'Failed to update ticket.');
      }
    } catch (err) {
      setSubmitError('Error updating ticket.');
      console.error('Update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPending || workflowsPending) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading ticket...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-red-500">Error loading ticket: {error}</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Ticket not found</div>
      </div>
    );
  }

  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
  const moduleOptions = ['Authentication', 'Reporting Engine', 'User Management', 'Notification Service', 'Dashboard', 'UI/UX'];

  // Build status options: current + allowed next steps
  const statusOptions = [
    { value: formData.stepCode, label: `${formData.status} (Current)` },
    ...allowedSteps.map(step => ({
      value: step.step_code,
      label: step.step_name
    }))
  ];

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={() => navigate("/tickets")} 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Tickets
            </button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Ticket
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-mono text-sm">{ticket.id}</p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <TicketDetailsForm
              formData={formData}
              handleInputChange={handleInputChange}
              handleTagToggle={handleTagToggle}
              tags={tagsList || []}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              loadingSteps={loadingSteps}
            />

            <AttachmentUploader onAttachmentsChange={handleNewAttachmentsChange} />

            <CommentSection
              comments={comments}
              newCommentText={newCommentText}
              setNewCommentText={setNewCommentText}
              isAddingComment={isAddingComment}
              handleCommentSubmit={handleCommentSubmit}
              handleDeleteComment={(id) => {
                setCommentToDeleteId(id);
                setShowDeleteModal(true);
              }}
              handleSaveCommentEdit={handleSaveCommentEdit}
              handleCancelCommentEdit={() => {
                setEditingCommentId(null);
                setEditingCommentText('');
              }}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
              editingCommentText={editingCommentText}
              setEditingCommentText={setEditingCommentText}
              showDeleteModal={showDeleteModal}
              setShowDeleteModal={setShowDeleteModal}
              commentToDeleteId={commentToDeleteId}
              confirmDeleteComment={confirmDeleteComment}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <AssignmentAndTimeline
              formData={formData}
              handleInputChange={handleInputChange}
              workgroups={workgroups || []}
              employees={employees || []}
              moduleOptions={moduleOptions}
            />

            {savedAttachments.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Attachments
                </h4>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {savedAttachments.map(file => {
                    const isImage = file.type?.startsWith('image/');
                    return (
                      <li key={file.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          {isImage && (
                            <img 
                              src={file.data} 
                              alt="Attachment" 
                              className="w-10 h-10 object-cover rounded-md" 
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={file.data} 
                            download={file.name} 
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Download
                          </a>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSavedAttachment(file)} 
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {submitError}
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Updating...' : 'Update Ticket'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(`/view-ticket/${ticket.id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTicket;