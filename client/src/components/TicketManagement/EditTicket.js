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
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MAX_TICKET_TITLE_LENGTH = 75;
const MAX_TICKET_DESCRIPTION_LENGTH = 10000;
const MAX_COMMENT_LENGTH = 5000;

const getPlainDescriptionText = (html = "") =>
  String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\u200B/g, "");

const stripHtml = (html = "") => getPlainDescriptionText(html).trim();

const isTerminalStatusVariant = (variant) =>
  variant === "new" || variant === "destructive";

const getTicketLoadError = (message) => {
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("do not have access") || normalized.includes("don't have access")) {
    return {
      title: "You don't have access to this ticket",
      description:
        "This ticket belongs to a project outside your assigned access. Contact an administrator if you think this is a mistake.",
    };
  }

  if (normalized.includes("workgroup")) {
    return {
      title: "You don't belong to the required workgroup",
      description:
        "Your current workgroup assignment does not allow editing this ticket.",
    };
  }

  if (normalized.includes("not found")) {
    return {
      title: "Ticket not found",
      description:
        "The ticket may have been removed or the link may be incorrect.",
    };
  }

  return {
    title: "Error loading ticket",
    description: message || "Something went wrong while loading this ticket.",
  };
};

const EditTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/api/tickets/${ticketId}?include_blobs=false`);
  const { data: employees } = useFetch('http://localhost:8000/api/employees'); 
  const ticketProjectId = ticket?.project_id || ticket?.projectId || '';
  const tagsUrl = ticketProjectId
    ? `http://localhost:8000/api/tags?project_id=${encodeURIComponent(ticketProjectId)}`
    : null;
  const modulesUrl = ticketProjectId
    ? `http://localhost:8000/api/modules?project_id=${encodeURIComponent(ticketProjectId)}`
    : null;
  const { data: tagsList } = useFetch(tagsUrl); 
  const { data: workgroups } = useFetch('http://localhost:8000/api/workgroups');
  const { data: workflows, isPending: workflowsPending } = useFetch('http://localhost:8000/api/workflows');
  const { data: modules } = useFetch(modulesUrl);

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
  const [attachmentBlobs, setAttachmentBlobs] = useState({});
  const [, setNewAttachments] = useState([]);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Workflow status options
  const [allowedSteps, setAllowedSteps] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const canEditTitleAndDescription =
    !!ticket?.created_by && String(ticket.created_by) === String(user?.id || '');

  useEffect(() => {
    if (!ticket) return;

    if (isTerminalStatusVariant(ticket.status_variant || ticket.statusVariant)) {
      toast.error("This ticket is closed/cancelled and cannot be edited.");
      navigate(`/view-ticket/${ticket.ticket_code || ticket.ticketCode || ticket.id}`, { replace: true });
    }
  }, [ticket, navigate]);

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
        status: ticket.current_step_name || ticket.status || '',
        priority: ticket.priority || 'Medium',
        workgroupId: ticket.workgroup_id || ticket.workgroupId || '',
        workGroup: ticket.workGroup || '',
        responsibleEmployeeId: ticket.responsible_employee_id || ticket.responsibleEmployeeId || '',
        responsible: ticket.responsible || '',
        moduleId: ticket.module_id || ticket.moduleId || '',
        module: ticket.module || '',
        tags: ticket.tags || [],
        startDate: ticket.start_date || ticket.startDate || '',
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

    if (name === 'title') {
      setFormData(prev => ({
        ...prev,
        title: String(value || '').slice(0, MAX_TICKET_TITLE_LENGTH),
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

  const fetchAttachmentBlob = async (attachmentId) => {
    if (attachmentBlobs[attachmentId]) return attachmentBlobs[attachmentId];
    const res = await fetchWithAuth(`http://localhost:8000/api/attachments/${attachmentId}/blob`);
    if (!res.ok) throw new Error("Failed to fetch attachment blob");
    const data = await res.json();
    const base64 = data.base64_data;
    setAttachmentBlobs(prev => ({ ...prev, [attachmentId]: base64 }));
    return base64;
  };

  const handleDownloadAttachment = async (file) => {
    try {
      const base64 = await fetchAttachmentBlob(file.id);
      if (!base64) return;
      const link = document.createElement("a");
      link.href = base64;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download attachment:", err);
    }
  };

  const handleLoadPreview = async (file) => {
    try {
      await fetchAttachmentBlob(file.id);
    } catch (err) {
      console.error("Failed to load attachment preview:", err);
    }
  };

  const getApiErrorMessage = async (res, fallbackMessage) => {
    try {
      const data = await res.json();
      if (data?.error) return data.error;
      if (data?.message) return data.message;
    } catch (_) {
      // ignore non-json error bodies
    }
    return fallbackMessage;
  };

  const canManageComment = (comment) =>
    String(comment?.author_id || '') === String(user?.id || '');

  const handleNewCommentTextChange = (value) => {
    setNewCommentText(String(value || '').slice(0, MAX_COMMENT_LENGTH));
  };

  const handleEditingCommentTextChange = (value) => {
    setEditingCommentText(String(value || '').slice(0, MAX_COMMENT_LENGTH));
  };

  // Comment handlers
  const handleCommentSubmit = async () => {
    const trimmedNewComment = newCommentText.trim();
    if (!trimmedNewComment) return;

    if (trimmedNewComment.length > MAX_COMMENT_LENGTH) {
      setSubmitError(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
      return;
    }

    setIsAddingComment(true);
    setSubmitError('');
    try {
      const res = await fetchWithAuth(`http://localhost:8000/api/comments`, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: ticketId,
          text: trimmedNewComment,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments([...comments, { 
          id: created.id, 
          text: trimmedNewComment, 
          author: user?.name || user?.full_name || 'Current User',
          author_id: user?.id,
          timestamp: new Date().toISOString() 
        }]);
        setNewCommentText('');
      } else {
        setSubmitError(await getApiErrorMessage(res, 'Failed to add comment.'));
      }
    } catch (err) {
      setSubmitError('Error adding comment.');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleSaveCommentEdit = async (commentId) => {
    const trimmedEditingComment = editingCommentText.trim();
    if (!trimmedEditingComment) return;

    if (trimmedEditingComment.length > MAX_COMMENT_LENGTH) {
      setSubmitError(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
      return;
    }

    const targetComment = comments.find((comment) => comment.id === commentId);

    if (!canManageComment(targetComment)) {
      setSubmitError('You can only edit your own comments.');
      return;
    }

    try {
      const res = await fetchWithAuth(`http://localhost:8000/api/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ text: trimmedEditingComment }),
      });
      if (res.ok) {
        setComments(comments.map(c => 
          c.id === commentId ? { ...c, text: trimmedEditingComment } : c
        ));
        setEditingCommentId(null);
        setEditingCommentText('');
      } else {
        setSubmitError(await getApiErrorMessage(res, 'Failed to update comment.'));
      }
    } catch {
      setSubmitError('Error updating comment.');
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    const targetComment = comments.find((comment) => comment.id === commentToDeleteId);

    if (!canManageComment(targetComment)) {
      setSubmitError('You can only delete your own comments.');
      setShowDeleteModal(false);
      setCommentToDeleteId(null);
      return;
    }

    try {
      const res = await fetchWithAuth(`http://localhost:8000/api/comments/${commentToDeleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentToDeleteId));
      } else {
        setSubmitError(await getApiErrorMessage(res, 'Failed to delete comment.'));
      }
    } catch {
      setSubmitError('Error deleting comment.');
    } finally {
      setShowDeleteModal(false);
      setCommentToDeleteId(null);
    }
  };

  // Submit main ticket form - FIXED WITH COMPLETE LOGGING
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (canEditTitleAndDescription) {
      const trimmedTitle = formData.title.trim();
      if (!trimmedTitle) {
        setSubmitError('Title is required.');
        return;
      }

      if (trimmedTitle.length > MAX_TICKET_TITLE_LENGTH) {
        setSubmitError(`Title must be ${MAX_TICKET_TITLE_LENGTH} characters or fewer.`);
        return;
      }

      if (stripHtml(formData.description).length > MAX_TICKET_DESCRIPTION_LENGTH) {
        setSubmitError(
          `Description must be ${MAX_TICKET_DESCRIPTION_LENGTH} characters or fewer.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');


  const userWorkgroup = user?.workgroup_code || user?.workgroupCode;
  const ticketWorkgroup = formData.workgroupId || ticket.workgroupId || ticket.workgroup_id;

  if (
    user.role_id !== 1 && // allow admin (role_id 1)
    userWorkgroup &&
    ticketWorkgroup &&
    userWorkgroup !== ticketWorkgroup
  ) {
    toast.error("You are not part of this workgroup. You cannot edit this ticket.", {
      position: "top-center",
    });
    setIsSubmitting(false);
    return; 
  }
    
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

        // Auto-assign workgroup based on new step
        await autoAssignWorkgroup(formData.stepCode);
      }
      
      // Then update other fields via PUT
      const updatePayload = {
        ...(canEditTitleAndDescription
          ? {
              title: formData.title.trim(),
              description: formData.description,
            }
          : {}),
        status: formData.status,
        priority: formData.priority,
        workflowId: formData.workflowId,
        workgroupId: formData.workgroupId,
        moduleId: formData.moduleId,
        responsibleEmployeeId: formData.responsibleEmployeeId,
        startDate: formData.startDate,
        tags: formData.tags,
      };

      const res = await fetchWithAuth(`http://localhost:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update ticket');
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
    const ticketError = getTicketLoadError(error);
    return (
      <div className="flex items-center justify-center min-h-64 p-6">
        <div className="max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <h2 className="text-lg font-semibold">{ticketError.title}</h2>
          <p className="mt-2 text-sm leading-6">{ticketError.description}</p>
        </div>
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
  const titleDescriptionLockMessage = ticket?.created_by
    ? "Only the ticket creator can edit title and description."
    : "This is a legacy ticket with no creator record. Title and description are locked for everyone until data is fixed.";
  const descriptionCharacterCount = stripHtml(formData.description).length;

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
          <p className="text-gray-600 dark:text-gray-300 font-mono text-sm">
            {ticket.ticket_code || ticket.ticketCode || ticket.id}
          </p>
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
              canEditTitleAndDescription={canEditTitleAndDescription}
              titleDescriptionLockMessage={titleDescriptionLockMessage}
              titleMaxLength={MAX_TICKET_TITLE_LENGTH}
              descriptionMaxLength={MAX_TICKET_DESCRIPTION_LENGTH}
              descriptionCharacterCount={descriptionCharacterCount}
            />

            <AttachmentUploader onAttachmentsChange={handleNewAttachmentsChange} />

            <CommentSection
              comments={comments}
              currentUserId={user?.id}
              newCommentText={newCommentText}
              setNewCommentText={handleNewCommentTextChange}
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
              setEditingCommentText={handleEditingCommentTextChange}
              commentMaxLength={MAX_COMMENT_LENGTH}
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
                    const blobData = attachmentBlobs[file.id];
                    return (
                      <li key={file.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          {isImage && blobData && (
                            <img 
                              src={blobData} 
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
                          {isImage && !blobData && (
                            <button
                              type="button"
                              onClick={() => handleLoadPreview(file)}
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                            >
                              Load Preview
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Download
                          </button>
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
            onClick={() => navigate(`/view-ticket/${ticket.ticket_code || ticket.ticketCode || ticket.id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTicket;
