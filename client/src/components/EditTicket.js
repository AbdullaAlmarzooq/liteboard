// EditTicket.js
import { useState, useEffect } from 'react';
import useFetch from "../useFetch";
import Button from "../components/Button";
import { useParams, useNavigate } from 'react-router-dom'
import TicketDetailsForm from './TicketDetailsForm';
import AssignmentAndTimeline from './AssignmentAndTimeline';
import CommentSection from './CommentSection';
import AttachmentUploader from './AttachmentUploader';

// Helper function for tag names, adapted for object format
const getTagNames = (tags) => {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.map(tag => typeof tag === 'object' ? tag.name : tag);
};

// Helper function to find tag ID from name
const getTagIdByName = (tagsList, tagName) => {
    const tag = tagsList.find(t => t.label === tagName || t.name === tagName);
    return tag ? tag.id : null;
};


const EditTicket = () => {
  const { ticketId } = useParams()
  const navigate = useNavigate()

  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/api/tickets/${ticketId}`);
  const { data: employees } = useFetch('http://localhost:8000/api/employees'); 
  const { data: tagsList } = useFetch('http://localhost:8000/api/tags'); 
  const { data: workgroups } = useFetch('http://localhost:8000/api/workgroups');
  const { data: workflows, isPending: workflowsPending } = useFetch('http://localhost:8000/api/workflows');

  // State for the main form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workflowId: '',
    status: '', // Maps to step_code in the DB
    priority: 'Medium',
    workgroupId: '',
    workGroup: '', // Resolved name from JOIN
    responsibleEmployeeId: '', // New ID field for API PUT
    responsible: '', // Resolved name from JOIN
    moduleId: '', // New ID field for API PUT
    module: '', // Resolved name from JOIN
    tags: [], // Array of {id, name} objects
    startDate: '',
    dueDate: '',
  });

  // State for comments and comment modal/editing logic
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState(null);

  // State for saved attachments (from the database)
  const [savedAttachments, setSavedAttachments] = useState([]);
  // State for new attachments (from the uploader)
  const [newAttachments, setNewAttachments] = useState([]);

  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // State for dynamically generated status options
  const [statusOptions, setStatusOptions] = useState([]);


  // Effect to populate form data, comments, and attachments when ticket data is fetched
  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title || '',
        description: ticket.description || '',
        workflowId: ticket.workflowId || '',
        status: ticket.status || '', // Status is now resolved from step_code
        priority: ticket.priority || 'Medium',
        workgroupId: ticket.workgroupId || '',
        workGroup: ticket.workGroup || '',       // Resolved name
        responsibleEmployeeId: ticket.responsibleEmployeeId || '', // ID
        responsible: ticket.responsible || '', // Resolved name
        moduleId: ticket.moduleId || '', // ID
        module: ticket.module || '', // Resolved name
        tags: ticket.tags || [], // Array of objects
        startDate: ticket.startDate || '',
        dueDate: ticket.dueDate || '',
      });
      // 2. UPDATE: Load comments and attachments from the ticket response
      setComments(ticket.comments || []);
      setSavedAttachments(ticket.attachments || []);
    }
  }, [ticket]);

// Generate allowed status options based on workflow steps
useEffect(() => {
  if (formData.workflowId && workflows) {
    const selectedWorkflow = workflows.find(wf => wf.id === formData.workflowId);

    if (selectedWorkflow && selectedWorkflow.steps) {
      const allSteps = [...selectedWorkflow.steps].sort(
        (a, b) => a.stepOrder - b.stepOrder
      );

      const currentStep = allSteps.find(step => step.stepName === formData.status || step.stepCode === formData.status);
      const currentOrder = currentStep ? currentStep.stepOrder : -1;

      let newStatusOptions = [];

      // Previous step
      const prevStep = allSteps.find(step => step.stepOrder === currentOrder - 1);
      if (prevStep) newStatusOptions.push(prevStep);

      // Current step
      if (currentStep) {
        newStatusOptions.push(currentStep);
      } else {
        // Fallback if ticket.status is not in workflow (e.g., Cancelled)
        newStatusOptions.push({ stepCode: formData.status, stepName: formData.status });
      }

      // Next step
      const nextStep = allSteps.find(step => step.stepOrder === currentOrder + 1);
      if (nextStep) newStatusOptions.push(nextStep);

      // Always allow Cancelled
      if (!newStatusOptions.find(s => s.stepName === "Cancelled")) {
        newStatusOptions.push({ stepCode: "CANCELLED", stepName: "Cancelled" });
      }

      setStatusOptions(newStatusOptions);
    } else {
      // Fallback if workflow is missing
      setStatusOptions([
        { stepCode: "WF-001-01", stepName: "Open" },
        { stepCode: "WF-001-03", stepName: "Closed" },
        { stepCode: "CANCELLED", stepName: "Cancelled" },
      ]);
    }
  }
}, [formData.workflowId, formData.status, workflows]);


  useEffect(() => {
    if (formData.workflowId && formData.status && workflows && workgroups) {
      const selectedWorkflow = workflows.find(wf => wf.id === formData.workflowId);
      // CRUCIAL FIX: Check for selectedWorkflow.steps
      if (selectedWorkflow && selectedWorkflow.steps) { 
        const currentStep = selectedWorkflow.steps.find(step => step.stepName === formData.status);
        if (currentStep && currentStep.workgroupCode) {
          // Find the full workgroup name from the workgroups list
          const workgroup = workgroups.find(wg => wg.id === currentStep.workgroupCode);
          if (workgroup) {
            setFormData(prev => ({
              ...prev,
              workgroupId: currentStep.workgroupCode,
              workGroup: workgroup.name
            }));
          }
        }
      }
    }
  }, [formData.workflowId, formData.status, workflows, workgroups]);

// Effect to automatically update responsible options based on status/workgroup
// This is fine, as it uses the fetched 'employees' list
  useEffect(() => {
    if (formData.workflowId && formData.status && workflows && employees) {
      const selectedWorkflow = workflows.find(wf => wf.id === formData.workflowId);
      // CRUCIAL FIX: Check for selectedWorkflow.steps
      if (selectedWorkflow && selectedWorkflow.steps) { 
        const currentStep = selectedWorkflow.steps.find(step => step.stepName === formData.status);
        if (currentStep && currentStep.workgroupCode) {
          const eligibleEmployees = employees.filter(emp => emp.workgroupCode === currentStep.workgroupCode);

          if (formData.responsible && !eligibleEmployees.find(emp => emp.name === formData.responsible)) {
            setFormData(prev => ({
              ...prev,
              responsible: '', 
              responsibleEmployeeId: '',
            }));
          }
        }
      }
    }
  }, [formData.workflowId, formData.status, workflows, employees]);


  // Handler for all input changes in the main form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // 3. UPDATE: Handle responsible/module change to update both ID and Name
    if (name === 'responsible') {
        const responsibleEmployee = employees.find(emp => emp.name === value);
        setFormData(prev => ({
            ...prev,
            responsible: value,
            responsibleEmployeeId: responsibleEmployee ? responsibleEmployee.id : '',
        }));
        return;
    }
    
    if (name === 'module') {
        // NOTE: Since the module select uses module name as value, we'll need a full modules list to get the ID.
        // Assuming moduleOptions is the full list or we fetch it separately.
        // For now, assume the user only changes the displayed name field.
        setFormData(prev => ({
            ...prev,
            module: value,
            // You'd need a moduleId here if modules were fetched. For now, keep as is.
        }));
        return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for toggling tags
  const handleTagToggle = (tagLabel) => {
    // tagLabel is the 'name' or 'label' of the tag being clicked
    setFormData(prev => {
      // Check if the tag is already selected by its name
      const isSelected = prev.tags.some(t => t.name === tagLabel);
      
      if (isSelected) {
        // Remove the tag object
        return {
          ...prev,
          tags: prev.tags.filter(t => t.name !== tagLabel)
        };
      } else {
        // Add the tag object. We need its ID from the tagsData list.
        // The tag list from the API uses 'label' for the name.
        const tagObject = tagsList.find(t => t.label === tagLabel);
        if (tagObject) {
          return {
            ...prev,
            // Create the expected object format for the frontend state and backend payload
            tags: [...prev.tags, { 
                id: tagObject.id, 
                name: tagObject.label, 
                color: tagObject.color 
            }]
          };
        }
        return prev;
      }
    });
  };

  // Handler for updating the newAttachments state
  const handleNewAttachmentsChange = (attachmentsFromUploader) => {
    setNewAttachments(attachmentsFromUploader);
  };
  
  // Handler for removing an attachment from the saved list
  const handleRemoveSavedAttachment = (fileToRemove) => {
    const updatedAttachments = savedAttachments.filter(file => file.id !== fileToRemove.id); // Use ID for removal
    setSavedAttachments(updatedAttachments);
  };

  // Handler for submitting a new comment
  const handleCommentSubmit = async () => {
    if (!newCommentText.trim()) return;

    setIsAddingComment(true);
    setSubmitError('');

    // NOTE: The backend handles comment ID generation now for new comments if we were POSTing to /api/comments.
    // However, the current implementation still sends the full ticket object on PUT.
    // The backend's PUT logic must handle inserting a new comment if the ID is not found.
    // We'll generate a temporary client-side ID for list management.
    const newCommentId = `CLT-COM-${Date.now()}`; // Temporary ID for client-side uniqueness
    const newComment = {
      id: newCommentId,
      text: newCommentText,
      author: 'Current User', // Placeholder for the current user
      timestamp: new Date().toISOString(),
      type: "comment",
    };

    const updatedComments = [...comments, newComment];

    try {
      // 5. UPDATE: Use /api/ prefix
      const response = await fetch(`http://localhost:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          ...formData,
          // Pass the whole array of comments for the backend to diff
          comments: updatedComments, 
          // Pass the whole array of attachments (saved + new)
          attachments: [...savedAttachments, ...newAttachments],
        }),
      });

      if (response.ok) {
        // The backend should return the updated ticket, but for now we trust the local update
        setComments(updatedComments.map(c => c.id === newCommentId ? { ...c, id: `COM-${comments.length + 1}` } : c)); // Simulate a persistent ID
        setNewCommentText('');
      } else {
        setSubmitError('Failed to add comment.');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setSubmitError('Error adding comment.');
    } finally {
      setIsAddingComment(false);
    }
  };

  // Handler for opening the delete confirmation modal
  const handleDeleteComment = (commentId) => {
    setCommentToDeleteId(commentId);
    setShowDeleteModal(true);
  };
  
  // Handler for confirming and performing the delete operation
  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    
    setSubmitError('');
    const updatedComments = comments.filter(comment => comment.id !== commentToDeleteId);
    
    try {
      // 6. UPDATE: Use /api/ prefix
      const response = await fetch(`http://localhost:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          ...formData,
          comments: updatedComments,
          attachments: [...savedAttachments, ...newAttachments],
        }),
      });
      
      if (response.ok) {
        setComments(updatedComments);
      } else {
        setSubmitError('Failed to delete comment.');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setSubmitError('Error deleting comment.');
    } finally {
      setShowDeleteModal(false);
      setCommentToDeleteId(null);
    }
  };

  // Handler for saving an edited comment
  const handleSaveCommentEdit = async (commentId) => {
    if (!editingCommentText.trim()) {
      setSubmitError('Comment text cannot be empty.');
      return;
    }

    setSubmitError('');
    const updatedComments = comments.map(comment =>
      comment.id === commentId ? { ...comment, text: editingCommentText } : comment
    );

    try {
      // 7. UPDATE: Use /api/ prefix
      const response = await fetch(`http://localhost:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          ...formData,
          comments: updatedComments,
          attachments: [...savedAttachments, ...newAttachments],
        }),
      });

      if (response.ok) {
        setComments(updatedComments);
        setEditingCommentId(null);
        setEditingCommentText('');
      } else {
        setSubmitError('Failed to update comment.');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      setSubmitError('Error updating comment.');
    }
  };

  // Handler for canceling comment edit
  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Function to add a generic activity entry
  const addActivityEntry = async (ticketId, fieldName, oldValue, newValue) => {
    // 8. UPDATE: Use /api/ prefix for status_history
    try {
      // Fetching history to get the next ID is an anti-pattern for a normalized DB,
      // but we keep the ID generation logic for now for consistency with the original code.
      // A proper normalized DB would let the server generate the ID.
      const historyResponse = await fetch('http://localhost:8000/api/status_history');
      const historyData = await historyResponse.json();
      
      // Client-side ID generation (should be server-side)
      const nextSequenceNumber = historyData.length + 1;
      const paddedSequence = String(nextSequenceNumber).padStart(3, '0');
      const newHistoryId = `ACT-${paddedSequence}`;

      const historyEntry = {
        id: newHistoryId,
        ticketId,
        type: 'field_change',
        fieldName,
        oldValue,
        newValue,
        timestamp: new Date().toISOString(),
        changedBy: 'Current User',
      };

      if (fieldName === 'status') {
        historyEntry.type = 'status_change';
      }
      
      // 9. UPDATE: Use /api/ prefix
      await fetch('http://localhost:8000/api/status_history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyEntry),
      });
    } catch (error) {
      console.error('Error adding activity entry:', error);
    }
  };

  // Main form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    // Merge saved and new attachments for the final update
    const finalAttachments = [...savedAttachments, ...newAttachments];

    // Compare original ticket data with new form data and log changes
    // 10. UPDATE: Use the resolved names/new IDs for comparison
    const fieldsToTrack = ['title', 'description', 'status', 'priority', 'workGroup', 'responsible', 'module', 'dueDate', 'startDate'];
    for (const field of fieldsToTrack) {
      const ticketFieldName = field === 'responsible' ? 'responsible' : field;
      const formDataFieldName = field === 'responsible' ? 'responsible' : field;
      
      // The original ticket has resolved names (workGroup, responsible, module).
      if (ticket[ticketFieldName] !== formData[formDataFieldName]) {
        const oldValue = ticket[ticketFieldName] || 'N/A';
        const newValue = formData[formDataFieldName] || 'N/A';
        await addActivityEntry(ticket.id, field, oldValue, newValue);
      }
    }
    
    // Tag handling
    const originalTagNames = getTagNames(ticket.tags);
    const newTagNames = getTagNames(formData.tags);

    const tagsAddedNames = newTagNames.filter(name => !originalTagNames.includes(name));
    const tagsRemovedNames = originalTagNames.filter(name => !newTagNames.includes(name));

    for (const name of tagsAddedNames) {
      await addActivityEntry(ticket.id, 'tags_added', '', name);
    }
    
    for (const name of tagsRemovedNames) {
      await addActivityEntry(ticket.id, 'tags_removed', name, '');
    }

    // Attachment handling (simplified - comparing by file name)
    const originalAttachmentNames = (ticket.attachments || []).map(a => a.name);
    const finalAttachmentNames = finalAttachments.map(a => a.name);

    const attachmentsAdded = finalAttachmentNames.filter(name => !originalAttachmentNames.includes(name));
    const attachmentsRemoved = originalAttachmentNames.filter(name => !finalAttachmentNames.includes(name));

    for (const name of attachmentsAdded) {
        await addActivityEntry(ticket.id, 'attachment_added', '', name);
    }
    for (const name of attachmentsRemoved) {
        await addActivityEntry(ticket.id, 'attachment_removed', name, '');
    }

    // 11. Final PUT request to the API
    try {
      // 12. UPDATE: Use /api/ prefix
      const response = await fetch(`http://localhost:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Pass required IDs for update logic
          workflowId: formData.workflowId,
          workgroupId: formData.workgroupId,
          moduleId: formData.moduleId,
          responsibleEmployeeId: formData.responsibleEmployeeId, // Use the ID
          
          // Pass other fields
          title: formData.title,
          description: formData.description,
          status: formData.status, // Maps to step_code
          priority: formData.priority,
          dueDate: formData.dueDate,
          startDate: formData.startDate,
          
          // Pass the tags objects (backend will extract the ID)
          tags: formData.tags, 
          comments,
          attachments: finalAttachments,
        }),
      });

      if (response.ok) {
        // Clear the new attachments list after successful submission
        setNewAttachments([]);
        navigate(`/view-ticket/${ticketId}`); // Use ticketId from params for navigation
      } else {
        setSubmitError('Failed to update ticket');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      setSubmitError('Error updating ticket');
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
          <p className="text-gray-600 dark:text-gray-300 font-mono text-sm">
            {ticket.id}
          </p>
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
              tags={tagsList} // Use the full list of tags
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
            />

            {/* Use the AttachmentUploader for adding NEW files */}
            <AttachmentUploader onAttachmentsChange={handleNewAttachmentsChange} />

            <CommentSection
              comments={comments}
              newCommentText={newCommentText}
              setNewCommentText={setNewCommentText}
              isAddingComment={isAddingComment}
              handleCommentSubmit={handleCommentSubmit}
              handleDeleteComment={handleDeleteComment}
              handleSaveCommentEdit={handleSaveCommentEdit}
              handleCancelCommentEdit={handleCancelCommentEdit}
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
              workgroups={workgroups}
              employees={employees}
              moduleOptions={moduleOptions}
            />

            {/* SECTION: Display and download SAVED attachments */}
            {savedAttachments.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Attachments</h4>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {savedAttachments.map((file) => {
                    const isImage = file.type?.startsWith('image/');
                    return (
                      <li key={file.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          {isImage && (
                            <img src={file.data} alt="Attachment preview" className="w-10 h-10 object-cover rounded-md" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
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

        {/* Error Message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {submitError}
          </div>
        )}

        {/* Action Buttons */}
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