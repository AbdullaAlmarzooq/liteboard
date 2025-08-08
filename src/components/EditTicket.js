// This is the refactored main component. It manages state and API calls, and renders the sub-components.
import { useState, useEffect } from 'react';
import useFetch from "../useFetch";
import Button from "../components/Button";

// Import the new sub-components
import TicketDetailsForm from './TicketDetailsForm';
import AssignmentAndTimeline from './AssignmentAndTimeline';
import CommentSection from './CommentSection';

const EditTicket = ({ ticketId, setCurrentPage }) => {
  // Fetch ticket data and related resources
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/tickets/${ticketId}`);
  const { data: employees } = useFetch('http://localhost:8000/employees');
  const { data: tags } = useFetch('http://localhost:8000/tags');
  const { data: workgroups } = useFetch('http://localhost:8000/workgroups');
  const { data: workflows, isPending: workflowsPending } = useFetch('http://localhost:8000/workflows');

  // State for the main form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workflowId: '', // New state field
    status: '',
    priority: 'Medium',
    workGroup: '',
    responsible: '',
    module: '',
    tags: [],
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

  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // State for dynamically generated status options
  const [statusOptions, setStatusOptions] = useState([]);


  // Effect to populate form data and comments when ticket data is fetched
  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title || '',
        description: ticket.description || '',
        workflowId: ticket.workflowId || '', // Set new workflowId state
        status: ticket.status || '',
        priority: ticket.priority || 'Medium',
        workGroup: ticket.workGroup || '',
        responsible: ticket.responsible || '',
        module: ticket.module || '',
        tags: ticket.tags || [],
        startDate: ticket.startDate || '',
        dueDate: ticket.dueDate || '',
      });
      setComments(ticket.comments || []);
    }
  }, [ticket]);

  // Effect to determine available statuses based on the selected workflow
  useEffect(() => {
    if (formData.workflowId && workflows) {
      const selectedWorkflow = workflows.find(wf => wf.id === formData.workflowId);
      if (selectedWorkflow) {
        const currentStepIndex = selectedWorkflow.steps.findIndex(step => step.stepName === formData.status);
        const newStatusOptions = [];
        if (currentStepIndex > 0) {
          newStatusOptions.push(selectedWorkflow.steps[currentStepIndex - 1].stepName);
        }
        newStatusOptions.push(selectedWorkflow.steps[currentStepIndex].stepName);
        if (currentStepIndex < selectedWorkflow.steps.length - 1) {
          newStatusOptions.push(selectedWorkflow.steps[currentStepIndex + 1].stepName);
        }
        setStatusOptions(newStatusOptions);
      }
    }
  }, [formData.workflowId, formData.status, workflows]);

  // Effect to automatically update workgroup based on status
  useEffect(() => {
    if (formData.workflowId && formData.status && workflows) {
      const selectedWorkflow = workflows.find(wf => wf.id === formData.workflowId);
      if (selectedWorkflow) {
        const currentStep = selectedWorkflow.steps.find(step => step.stepName === formData.status);
        if (currentStep && currentStep.workgroupCode) {
          // Find the full workgroup name from the workgroups list
          const workgroup = workgroups.find(wg => wg.id === currentStep.workgroupCode);
          if (workgroup) {
            setFormData(prev => ({
              ...prev,
              workGroup: workgroup.name
            }));
          }
        }
      }
    }
  }, [formData.workflowId, formData.status, workflows, workgroups]);


  // Handler for all input changes in the main form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for toggling tags
  const handleTagToggle = (tagLabel) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagLabel)
        ? prev.tags.filter(t => t !== tagLabel)
        : [...prev.tags, tagLabel]
    }));
  };

  // Handler for submitting a new comment
  const handleCommentSubmit = async () => {
    if (!newCommentText.trim()) return;

    setIsAddingComment(true);
    setSubmitError('');

    const nextSequenceNumber = comments.length + 1;
    const paddedSequence = String(nextSequenceNumber).padStart(3, '0');
    const newCommentId = `COM-${paddedSequence}`;

    const newComment = {
      id: newCommentId,
      text: newCommentText,
      author: 'Current User',
      timestamp: new Date().toISOString(),
      type: "comment",
    };

    const updatedComments = [...comments, newComment];

    try {
      const response = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          ...formData,
          comments: updatedComments,
        }),
      });

      if (response.ok) {
        setComments(updatedComments);
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
      const response = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          ...formData,
          comments: updatedComments,
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
      const response = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          ...formData,
          comments: updatedComments,
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
    // First, fetch the existing status history to get the next ID
    try {
      const historyResponse = await fetch('http://localhost:8000/status_history');
      const historyData = await historyResponse.json();
      
      const nextSequenceNumber = historyData.length + 1;
      const paddedSequence = String(nextSequenceNumber).padStart(3, '0');
      const newHistoryId = `ACT-${paddedSequence}`;

      const historyEntry = {
        id: newHistoryId,
        ticketId,
        type: 'field_change', // New type for field changes
        fieldName,
        oldValue,
        newValue,
        timestamp: new Date().toISOString(),
        changedBy: 'Current User', // Placeholder for the user who made the change
      };

      if (fieldName === 'status') {
        historyEntry.type = 'status_change';
      }
      
      await fetch('http://localhost:8000/status_history', {
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

    // Compare original ticket data with new form data and log changes
    const fieldsToTrack = ['title', 'description', 'status', 'priority', 'workGroup', 'responsible', 'module', 'dueDate', 'startDate'];
    for (const field of fieldsToTrack) {
      if (ticket[field] !== formData[field]) {
        const oldValue = ticket[field] || 'N/A';
        const newValue = formData[field] || 'N/A';
        await addActivityEntry(ticket.id, field, oldValue, newValue);
      }
    }

    // Handle tag changes separately
    const originalTags = ticket.tags || [];
    const newTags = formData.tags || [];

    const tagsAdded = newTags.filter(tag => !originalTags.includes(tag));
    const tagsRemoved = originalTags.filter(tag => !newTags.includes(tag));

    for (const tag of tagsAdded) {
      await addActivityEntry(ticket.id, 'tags_added', '', tag);
    }
    
    for (const tag of tagsRemoved) {
      await addActivityEntry(ticket.id, 'tags_removed', tag, '');
    }

    try {
      const response = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          ...formData,
          comments,
        }),
      });

      if (response.ok) {
        setCurrentPage(`view-ticket-${ticketId}`);
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
              onClick={() => setCurrentPage("tickets")}
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
              tags={tags}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
            />

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
            onClick={() => setCurrentPage(`view-ticket-${ticket.id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTicket;