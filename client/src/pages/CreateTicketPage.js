"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Button from "../components/Button"
import Badge from "../components/Badge"
import useFetch from "../useFetch"
import { AlertCircle, CheckCircle, X } from "lucide-react"

// Toast Component
const Toast = ({ message, type, onClose, isVisible }) => {
  if (!isVisible) return null

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm transform transition-all duration-300 ease-in-out max-w-md"
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200`
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200`
      default:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200`
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />
      case 'error':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />
      default:
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />
    }
  }

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Custom hook for toast notifications
const useToast = () => {
  const [toast, setToast] = useState({ message: '', type: '', isVisible: false })

  const showToast = (message, type = 'info') => {
    setToast({ message, type, isVisible: true })
    
    setTimeout(() => {
      hideToast()
    }, 5000)
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  return { toast, showToast, hideToast }
}

const CreateTicketPage = () => {
  const [selectedTags, setSelectedTags] = useState([])
  const [customTag, setCustomTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    workflowId: "",
    status: "",
    stepCode: "",
    priority: "",
    workGroup: "",
    workGroupCode: "",
    responsible: "",
    module: "",
    startDate: "",
    dueDate: ""
  })

  const { data: availableTags, isPending: tagsLoading, error: tagsError } = useFetch('http://localhost:8000/api/tags')
  const { data: employees, isPending: employeesLoading, error: employeesError } = useFetch('http://localhost:8000/api/employees')
  const { data: workgroups, isPending: workgroupsLoading, error: workgroupsError } = useFetch('http://localhost:8000/api/workgroups')
  const { data: modules, isPending: modulesLoading, error: modulesError } = useFetch('http://localhost:8000/api/modules')
  const { data: workflows, isPending: workflowsLoading, error: workflowsError } = useFetch('http://localhost:8000/api/workflows')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const getWorkgroupName = (workgroupCode) => {
    if (!workgroups || workgroups.length === 0) return '';
    const wg = workgroups.find(w => w.id === workgroupCode);
    return wg ? wg.name : '';
  }

  const getEmployeesByWorkgroup = (workgroupCode) => {
    if (!employees || !workgroupCode) return [];
    return employees.filter(emp => emp.workgroupId === workgroupCode);
  }

  const handleWorkflowChange = async (e) => {
    const workflowId = e.target.value;
    
    if (!workflowId) {
      setFormData(prev => ({ 
        ...prev, 
        workflowId: '', 
        status: '', 
        stepCode: '',
        workGroup: '',
        workGroupCode: '',
        responsible: '' 
      }));
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/workflows/${workflowId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflow details');
      }
      
      const selectedWorkflow = await response.json();
      
      console.log('Full workflow response:', selectedWorkflow);
      console.log('Workflow steps:', selectedWorkflow.steps);
      
      if (!selectedWorkflow) {
        throw new Error('Workflow data is missing');
      }
      
      if (!selectedWorkflow.steps || !Array.isArray(selectedWorkflow.steps)) {
        console.error('Workflow steps format:', selectedWorkflow);
        showToast('Workflow has invalid step structure', 'error');
        setFormData(prev => ({ 
          ...prev, 
          workflowId, 
          status: '', 
          stepCode: '',
          workGroup: '',
          workGroupCode: '',
          responsible: ''
        }));
        return;
      }
      
      if (selectedWorkflow.steps.length === 0) {
        showToast('Workflow has no steps defined', 'error');
        setFormData(prev => ({ 
          ...prev, 
          workflowId, 
          status: '', 
          stepCode: '',
          workGroup: '',
          workGroupCode: '',
          responsible: ''
        }));
        return;
      }

      const firstStep = selectedWorkflow.steps[0];
      console.log('First step:', firstStep);
      
      const initialStatus = firstStep.stepName || firstStep.step_name || '';
      const stepCode = firstStep.stepCode || firstStep.step_code || '';
      const assignedWorkgroupCode = firstStep.workgroupCode || firstStep.workgroup_code || '';
      const assignedWorkgroupName = firstStep.workgroupName || firstStep.workgroup_name || getWorkgroupName(assignedWorkgroupCode);

      setFormData(prev => ({
        ...prev,
        workflowId,
        status: initialStatus,
        stepCode: stepCode,
        workGroup: assignedWorkgroupName,
        workGroupCode: assignedWorkgroupCode,
        responsible: ''
      }));
    } catch (error) {
      console.error('Error fetching workflow:', error);
      showToast(`Failed to load workflow: ${error.message}`, 'error');
      setFormData(prev => ({ 
        ...prev, 
        workflowId, 
        status: '', 
        stepCode: '',
        workGroup: '',
        workGroupCode: '',
        responsible: ''
      }));
    }
  };

  const addTag = tag => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const removeTag = tag => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const addCustomTag = async () => {
    if (customTag.trim()) {
      const newTag = customTag.trim().toLowerCase()
      
      addTag(newTag)
      
      const existingTags = availableTags || []
      if (!existingTags.some(tag => tag.label === newTag)) {
        try {
          const response = await fetch('http://localhost:8000/api/tags', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              label: newTag,
            })
          })
          
          if (!response.ok) {
            showToast('Failed to add tag to database', 'error')
          } else {
            showToast('Custom tag added successfully', 'success')
          }
        } catch (error) {
          showToast('Error adding tag: ' + error.message, 'error')
        }
      }
      
      setCustomTag("")
    }
  }

  const deleteTagFromDB = async (tagId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/tags/${tagId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        showToast('Failed to delete tag from database', 'error')
      } else {
        showToast('Tag deleted successfully', 'success')
        window.location.reload()
      }
    } catch (error) {
      showToast('Error deleting tag: ' + error.message, 'error')
    }
  }

const generateTicketId = async () => {
  try {
    const token = localStorage.getItem("token"); // 👈 read token

    const response = await fetch('http://localhost:8000/api/tickets', {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${response.status}`);
    }

    const tickets = await response.json();

    if (!Array.isArray(tickets)) {
      throw new Error("Tickets response is not an array");
    }

    const existingNumbers = tickets
      .map(ticket => {
        const code = ticket.ticket_code || ticket.ticketCode || ticket.id || '';
        const match = code.match(/TCK-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => !isNaN(num));

    const highestNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
    const nextNumber = highestNumber + 1;

    return `TCK-${nextNumber}`;
  } catch (error) {
    console.error('Error generating ticket ID:', error);
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    return `TCK-${randomId}`;
  }
};


  const formatDate = (dateString) => {
    if (!dateString) return ""
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString
    }
    
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      const [day, month, year] = dateString.split('/')[0].split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return dateString
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      showToast('Please enter a ticket title', 'error')
      return false
    }

    if (!formData.workflowId) {
        showToast('Please select a workflow', 'error')
        return false
    }

    if (!formData.priority) {
      showToast('Please select a priority level', 'error')
      return false
    }

    if (!formData.description.trim()) {
      showToast('Please provide a description', 'error')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!validateForm()) {
        setIsSubmitting(false)
        return
      }

      const ticketId = await generateTicketId()

      const tag_ids = selectedTags
        .map(tagLabel => {
          const tag = availableTags?.find(t => t.label === tagLabel);
          return tag ? tag.id : null;
        })
        .filter(id => id !== null);

      const selectedEmployee = employees?.find(emp => emp.name === formData.responsible);
      const responsible_employee_id = selectedEmployee ? selectedEmployee.id : null;

      const selectedModule = modules?.find(mod => mod.name === formData.module);
      const module_id = selectedModule ? selectedModule.id : null;

      const ticketData = {
        id: ticketId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        step_code: formData.stepCode,
        priority: formData.priority,
        workflow_id: formData.workflowId,
        workgroup_id: formData.workGroupCode,
        responsible_employee_id: responsible_employee_id,
        module_id: module_id,
        tag_ids: tag_ids,
        start_date: formatDate(formData.startDate) || null,
        due_date: formatDate(formData.dueDate) || null
      }

      console.log('Ticket data being sent:', ticketData);

      const response = await fetch('http://localhost:8000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(ticketData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Ticket created successfully:', result)
      
      setFormData({
        title: "",
        description: "",
        workflowId: "",
        status: "",
        stepCode: "",
        priority: "",
        workGroup: "",
        workGroupCode: "",
        responsible: "",
        module: "",
        startDate: "",
        dueDate: ""
      })
      setSelectedTags([])
      
      showToast('Ticket created successfully!', 'success')
      
    } catch (error) {
      console.error('Error creating ticket:', error)
      showToast(`Failed to create ticket: ${error.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: "",
      description: "",
      workflowId: "",
      status: "",
      stepCode: "",
      priority: "",
      workGroup: "",
      workGroupCode: "",
      responsible: "",
      module: "",
      startDate: "",
      dueDate: ""
    })
    setSelectedTags([])
    setCustomTag("")
    showToast('Form cleared', 'info')
  }

  const isLoading = tagsLoading || employeesLoading || workgroupsLoading || modulesLoading || workflowsLoading
  const hasError = tagsError || employeesError || workgroupsError || modulesError || workflowsError

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create New Ticket
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create New Ticket
          </h1>
          <div className="space-y-2">
            {tagsError && <p className="text-red-600 dark:text-red-400">Error loading tags: {tagsError.message}</p>}
            {employeesError && <p className="text-red-600 dark:text-red-400">Error loading employees: {employeesError.message}</p>}
            {workgroupsError && <p className="text-red-600 dark:text-red-400">Error loading workgroups: {workgroupsError.message}</p>}
            {workflowsError && <p className="text-red-600 dark:text-red-400">Error loading workflows: {workflowsError.message}</p>}
          </div>
        </div>
      </div>
    )
  }

  const handleKeyPress = e => {
    if (e.key === "Enter") {
      e.preventDefault()
      addCustomTag()
    }
  }

  const availableEmployees = getEmployeesByWorkgroup(formData.workGroupCode)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={hideToast}
        isVisible={toast.isVisible}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Create New Ticket
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Fill out the form below to create a new ticket
        </p>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Provide all necessary information for the new ticket
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter ticket title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the ticket in detail"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="workflow" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Workflow <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="workflow"
                    name="workflowId"
                    value={formData.workflowId}
                    onChange={handleWorkflowChange}
                    disabled={!workflows || workflows.length === 0 || !workgroups || workgroups.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select workflow</option>
                    {workflows && workflows.length > 0 ? (
                      workflows.map(workflow => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No workflows available</option>
                    )}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Initial Status
                  </label>
                  <input
                    id="status"
                    name="status"
                    type="text"
                    value={formData.status}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="workgroup" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    WorkGroup Assigned
                  </label>
                  <input
                    id="workgroup"
                    name="workGroup"
                    type="text"
                    value={formData.workGroup}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="responsible" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Person Responsible
                  </label>
                  <select
                    id="responsible"
                    name="responsible"
                    value={formData.responsible}
                    onChange={handleInputChange}
                    disabled={!formData.workGroupCode}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-700"
                  >
                    <option value="">
                      {!formData.workGroupCode 
                        ? "Select workflow first" 
                        : availableEmployees.length === 0 
                          ? "No employees in this workgroup" 
                          : "Select person"
                      }
                    </option>
                    {availableEmployees.map(employee => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                  {formData.workgroupId && availableEmployees.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No employees assigned to this workgroup
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="module" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Module
                  </label>
                  <select
                    id="module"
                    name="module"
                    value={formData.module}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select module</option>
                    {modules && modules.length > 0 ? (
                      modules.map(module => (
                        <option key={module.id} value={module.name}>
                          {module.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No modules available</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {availableTags && availableTags.length > 0 ? (
                      availableTags.map(tag => (
                        <Button
                          key={tag.id}
                          type="button"
                          variant={selectedTags.includes(tag.label) ? "primary" : "outline"}
                          size="sm"
                          onClick={() =>
                            selectedTags.includes(tag.label) ? removeTag(tag.label) : addTag(tag.label)
                          }
                        >
                          {tag.label}
                        </Button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No tags available</p>
                    )}
                  </div>

                  {selectedTags.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Selected Tags:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map(tag => (
                          <div key={tag} className="flex items-center">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                ✕
                              </button>
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="startdate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    id="startdate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="duedate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Ticket"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreateTicketPage
