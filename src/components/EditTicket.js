import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Badge from "../components/Badge"
import Button from "../components/Button"
import useFetch from "../useFetch"
import { useState, useEffect } from 'react';

const EditTicket = ({ ticketId, setCurrentPage }) => {
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/tickets/${ticketId}`);
  const { data: employees } = useFetch('http://localhost:8000/employees');
  const { data: tags } = useFetch('http://localhost:8000/tags');
  const { data: workgroups } = useFetch('http://localhost:8000/workgroups');

  

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    workGroup: '',
    responsible: '',
    module: '',
    tags: [],
    startDate: '',
    dueDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load ticket data into form when ticket is fetched
  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title || '',
        description: ticket.description || '',
        status: ticket.status || 'Open',
        priority: ticket.priority || 'Medium',
        workGroup: ticket.workGroup || '',
        responsible: ticket.responsible || '',
        module: ticket.module || '',
        tags: ticket.tags || [],
        startDate: ticket.startDate || '',
        dueDate: ticket.dueDate || ''
      });
    }
  }, [ticket]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagToggle = (tagLabel) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagLabel)
        ? prev.tags.filter(t => t !== tagLabel)
        : [...prev.tags, tagLabel]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket, // Keep original data like id, initiateDate
          ...formData // Override with form data
        }),
      });

      if (response.ok) {
        // Navigate back to tickets page or view page
        setCurrentPage('tickets');
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

  if (isPending) {
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

  const statusOptions = ['Open', 'In Progress', 'Closed'];
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
  const moduleOptions = ['Authentication', 'Reporting Engine', 'User Management', 'Notification Service'];

  return (
    <div className="space-y-6">
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe the ticket details..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags && tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.label)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        formData.tags.includes(tag.label)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assignment & Timeline */}
          <div className="space-y-6">
            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    Work Group
  </label>
  <select
    name="workGroup"
    value={formData.workGroup}
    onChange={handleInputChange}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
  >
    <option value="">Select Work Group</option>
    {workgroups && workgroups.map(wg => (
      <option key={wg.id} value={wg.name}>{wg.name}</option>
    ))}
  </select>
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    Responsible Person
  </label>
  <select
    name="responsible"
    value={formData.responsible}
    onChange={handleInputChange}
    disabled={!employees}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
  >
    <option value="">
      {employees ? "Select Person" : "Loading employees..."}
    </option>
    {employees && employees
      .filter(emp => emp.active)
      .map(emp => (
        <option key={emp.id} value={emp.name}>{emp.name}</option>
      ))}
  </select>
</div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Module
                  </label>
                  <select
                    name="module"
                    value={formData.module}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Module</option>
                    {moduleOptions.map(module => (
                      <option key={module} value={module}>{module}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </CardContent>
            </Card>
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