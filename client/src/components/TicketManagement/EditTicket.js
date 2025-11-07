// EditTicket.js
import { useState, useEffect } from 'react';
import useFetch from "../../useFetch";
import Button from "../Button";
import { useParams, useNavigate } from 'react-router-dom';
import TicketDetailsForm from './TicketDetailsForm';
import AssignmentAndTimeline from './AssignmentAndTimeline';
import CommentSection from './CommentSection';
import AttachmentUploader from './AttachmentUploader';
import { useAuth } from "../hooks/useAuth";
import fetchWithAuth from "../../utils/fetchWithAuth";



const EditTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/api/tickets/${ticketId}`);
  const { data: employees } = useFetch('http://localhost:8000/api/employees'); 
  const { data: tagsList } = useFetch('http://localhost:8000/api/tags'); 
  const { data: workgroups } = useFetch('http://localhost:8000/api/workgroups');
  const { data: workflows, isPending: workflowsPending } = useFetch('http://localhost:8000/api/workflows');
  const { data: modules } = useFetch('http://localhost:8000/api/modules'); // Fetch modules from API

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

  // Workflow status options
  const [allowedSteps, setAllowedSteps] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  // Populate form when ticket loads
  useEffect(() => {
    if (ticket) {
      const currentStepCode = formData.stepCode || ticket?.stepCode || ticket?.step_code;

      const statusOptions = [];

      if (currentStepCode && formData.status) {
        statusOptions.push({ 
          value: currentStepCode, 
          label: formData.status 
        });
      }

      if (allowedSteps && allowedSteps.length > 0) {
        allowedSteps
          .filter(step => step.step_code !== currentStepCode)
          .forEach(step => {
            statusOptions.push({
              value: step.step_code,
              label: step.step_name
            });
          });
      }

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
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:8000/api/tickets/${ticketId}/allowed-steps`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          }
        });
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
  }, [ticketId]);

  // Auto-assign workgroup when step changes
  const autoAssignWorkgroup = async (newStepCode) => {
    if (!workflows || !newStepCode) return;

    const allSteps = workflows.flatMap(wf => wf.steps || []);
    const newStep = allSteps.find(s => s.stepCode === newStepCode || s.step_code === newStepCode);

    if (newStep && newStep.workgroupCode) {
      const workgroup = workgroups?.find(wg => wg.id === newStep.workgroupCode);
      
      if (workgroup) {
        setFormData(prev => ({
          ...prev,
          workgroupId: workgroup.id,
          workGroup: workgroup.name
        }));

        if (employees && employees.length > 0) {
          const eligibleEmployees = employees.filter(
            emp => emp.workgroupCode === workgroup.id
          );

          if (eligibleEmployees.length > 0) {
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
      
      const allSteps = workflows.flatMap(wf => wf.steps || []);
      const newStep = allSteps.find(s => s.stepCode === newStepCode || s.step_code === newStepCode);
      
      let newWorkgroupId = formData.workgroupId;
      let newWorkgroupName = formData.workGroup;
      
      if (newStep && newStep.workgroupCode) {
        const newWorkgroup = workgroups?.find(wg => wg.id === newStep.workgroupCode);
        if (newWorkgroup) {
          newWorkgroupId = newWorkgroup.id;
          newWorkgroupName = newWorkgroup.name;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        stepCode: newStepCode,
        status: result.ticket?.status || result.ticket?.current_step_name || prev.status,
        workgroupId: newWorkgroupId,
        workGroup: newWorkgroupName,
        responsibleEmployeeId: newWorkgroupId !== prev.workgroupId ? '' : prev.responsibleEmployeeId,
        responsible: newWorkgroupId !== prev.workgroupId ? '' : prev.responsible
      }));

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
      const selectedStep = allowedSteps.find(step => step.step_code === value);
      const selectedStepName = selectedStep ? selectedStep.step_name : formData.status;
    
      const allSteps = workflows.flatMap(wf => wf.steps || []);
      const newStep = allSteps.find(s => s.step_code === value || s.stepCode === value);
    
      let newWorkgroupId = formData.workgroupId;
      let newWorkgroupName = formData.workGroup;
    
      if (newStep && newStep.workgroupCode) {
        const newWorkgroup = workgroups?.find(wg => wg.id === newStep.workgroupCode);
        if (newWorkgroup) {
          newWorkgroupId = newWorkgroup.id;
          newWorkgroupName = newWorkgroup.name;
        }
      }
    
      setFormData(prev => ({
        ...prev,
        stepCode: value,
        status: selectedStepName,
        workgroupId: newWorkgroupId,
        workGroup: newWorkgroupName,
        responsibleEmployeeId: '',
        responsible: ''
      }));
      return;
    }
    
    if (name === 'responsibleEmployeeId') {
      const responsibleEmployee = employees?.find(emp => emp.id === value);
      setFormData(prev => ({
        ...prev,
        responsibleEmployeeId: value,
        responsible: responsibleEmployee ? responsibleEmployee.name : '',
      }));
      return;
    }
    
    // FIX: Handle module selection - set both moduleId and module name
    if (name === 'module') {
      const selectedModule = modules?.find(mod => mod.id === value);
      setFormData(prev => ({ 
        ...prev, 
        moduleId: value,
        module: selectedModule ? selectedModule.name : value 
      }));
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
          author: user?.id || 'Unknown',
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

  // Status history entry - FIXED: Now handles null values properly
  const addActivityEntry = async (fieldName, oldValue, newValue) => {
    try {
      await fetch(`http://localhost:8000/api/status_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          activity_type: fieldName === 'status' ? 'status_change' : 'field_change',
          field_name: fieldName,
          old_value: oldValue || null,
          new_value: newValue || null,
          changed_by: user?.id || 'Unknown',
        }),
      });
    } catch (err) {
      console.error('Error adding activity entry:', err);
    }
  };

  // Submit main ticket form - FIXED WITH COMPLETE LOGGING
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    const finalAttachments = [...savedAttachments, ...newAttachments];
    
    try {
      // Check if status/step changed
      const originalStepCode = ticket.step_code || ticket.stepCode;
      const hasStatusChanged = formData.stepCode && formData.stepCode !== originalStepCode;
      
      // If status changed, call transition endpoint first
      if (hasStatusChanged) {
        const transitionResponse = await fetchWithAuth(`http://localhost:8000/api/tickets/${ticketId}/transition`, {
          method: 'POST',
          body: JSON.stringify({ step_code: formData.stepCode })
        });


        if (!transitionResponse.ok) {
          const errorData = await transitionResponse.json();
          throw new Error(errorData.message || errorData.error || 'Invalid transition');
        }

        // ✅ LOG THE STATUS CHANGE
        await addActivityEntry('status', ticket.status, formData.status);

        // Auto-assign workgroup based on new step
        await autoAssignWorkgroup(formData.stepCode);
      }
      
      // Track other field changes BEFORE updating
      const fieldChanges = [];
      
      if (formData.priority !== ticket.priority) {
        fieldChanges.push({ field: 'priority', oldValue: ticket.priority, newValue: formData.priority });
      }
      
      if (formData.workgroupId !== (ticket.workgroup_id || ticket.workgroupId)) {
        fieldChanges.push({ field: 'workGroup', oldValue: ticket.workGroup, newValue: formData.workGroup });
      }
      
      if (formData.responsibleEmployeeId !== (ticket.responsible_employee_id || ticket.responsibleEmployeeId)) {
        fieldChanges.push({ field: 'responsible', oldValue: ticket.responsible, newValue: formData.responsible });
      }
      
      if (formData.module !== ticket.module) {
        fieldChanges.push({ field: 'module', oldValue: ticket.module, newValue: formData.module });
      }
      
      if (formData.dueDate !== (ticket.due_date || ticket.dueDate)) {
        fieldChanges.push({ field: 'dueDate', oldValue: ticket.due_date || ticket.dueDate, newValue: formData.dueDate });
      }
      
      if (formData.startDate !== (ticket.start_date || ticket.startDate)) {
        fieldChanges.push({ field: 'startDate', oldValue: ticket.start_date || ticket.startDate, newValue: formData.startDate });
      }
      
      // Check tag changes
      const originalTags = ticket.tags || [];
      const newTags = formData.tags || [];
      const originalTagNames = originalTags.map(t => t.name);
      const newTagNames = newTags.map(t => t.name);
      
      const addedTags = newTagNames.filter(tag => !originalTagNames.includes(tag));
      const removedTags = originalTagNames.filter(tag => !newTagNames.includes(tag));
      
      // Then update other fields via PUT
      const res = await fetchWithAuth(`http://localhost:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          workflowId: formData.workflowId,
          workgroupId: formData.workgroupId,
          moduleId: formData.moduleId,
          responsibleEmployeeId: formData.responsibleEmployeeId,
          dueDate: formData.dueDate,
          startDate: formData.startDate,
          tags: formData.tags,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update ticket');
      }
      
      // ✅ LOG ALL FIELD CHANGES
      for (const change of fieldChanges) {
        await addActivityEntry(change.field, change.oldValue, change.newValue);
      }
      
      // ✅ LOG TAG CHANGES
      for (const tag of addedTags) {
        await addActivityEntry('tags_added', null, tag);
      }
      for (const tag of removedTags) {
        await addActivityEntry('tags_removed', tag, null);
      }
      
      // Success - navigate away
      setNewAttachments([]);
      navigate(`/view-ticket/${ticketId}`);
      
    } catch (err) {
      setSubmitError(err.message || 'Error updating ticket');
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

  const currentStepCode = formData.stepCode || ticket?.stepCode || ticket?.step_code;
  const originalStepCode = ticket?.stepCode || ticket?.step_code;
  const hasChanged = currentStepCode !== originalStepCode;

  const statusOptions = [];

  if (currentStepCode && formData.status) {
    statusOptions.push({ 
      value: currentStepCode, 
      label: hasChanged 
        ? `${formData.status} ← Selected (will save on Update)` 
        : `${formData.status} (Current)`
    });
  }

  if (allowedSteps && allowedSteps.length > 0) {
    allowedSteps
      .filter(step => step.step_code !== currentStepCode)
      .forEach(step => {
        statusOptions.push({
          value: step.step_code,
          label: step.step_name
        });
      });
  }

  return (
    <div className="relative space-y-6">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TicketDetailsForm
              formData={formData}
              handleInputChange={handleInputChange}
              handleTagToggle={handleTagToggle}
              tags={tagsList || []}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              loadingSteps={loadingSteps}
              workflow={workflows?.find(wf => wf.id === formData.workflowId)}
              ticket={ticket}
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

          <div className="space-y-6">
            <AssignmentAndTimeline
              formData={formData}
              handleInputChange={handleInputChange}
              workgroups={workgroups || []}
              employees={employees || []}
              moduleOptions={modules || []} // Pass modules from API
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