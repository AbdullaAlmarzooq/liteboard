"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Button from "../components/Button"
import Badge from "../components/Badge"
import useFetch from "../useFetch"
import TicketEditor from "../components/TicketManagement/TicketEditor"
import { useAuth } from "../components/hooks/useAuth"
import fetchWithAuth from "../utils/fetchWithAuth"
import {
  CreateTicketPageSkeleton,
  CreateTicketStepDetailsSkeleton,
} from "../components/PageSkeletons"
import { AlertCircle, CheckCircle, X } from "lucide-react"

const MAX_TICKET_TITLE_LENGTH = 75
const MAX_TICKET_DESCRIPTION_LENGTH = 10000

const createInitialFormData = (projectId = "") => ({
  projectId,
  title: "",
  description: "",
  workflowId: "",
  status: "",
  stepCode: "",
  priority: "",
  workGroup: "",
  workGroupCode: "",
  responsibleEmployeeId: "",
  moduleId: "",
  startDate: "",
  dueDate: "",
})

const Toast = ({ message, type, onClose, isVisible }) => {
  if (!isVisible) return null

  const getToastStyles = () => {
    const baseStyles =
      "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm transform transition-all duration-300 ease-in-out max-w-md"

    switch (type) {
      case "success":
        return `${baseStyles} bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200`
      case "error":
        return `${baseStyles} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200`
      default:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200`
    }
  }

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />
      case "error":
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

const useToast = () => {
  const [toast, setToast] = useState({ message: "", type: "", isVisible: false })

  const showToast = (message, type = "info") => {
    setToast({ message, type, isVisible: true })
    setTimeout(() => {
      hideToast()
    }, 5000)
  }

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }))
  }

  return { toast, showToast, hideToast }
}

const getPlainDescriptionText = (html = "") =>
  html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\u200B/g, "")

const stripHtml = (html = "") => getPlainDescriptionText(html).trim()

const formatDate = (dateString) => {
  if (!dateString) return ""

  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString
  }

  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    const [day, month, year] = dateString.split("/")[0].split("/")
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  return dateString
}

const CreateTicketPage = () => {
  const { user } = useAuth()
  const { toast, showToast, hideToast } = useToast()
  const [selectedTags, setSelectedTags] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState(createInitialFormData())

  const {
    data: projects,
    isPending: projectsLoading,
    error: projectsError,
  } = useFetch("http://localhost:8000/api/projects/available")
  const {
    data: employees,
    isPending: employeesLoading,
    error: employeesError,
  } = useFetch("http://localhost:8000/api/employees")
  const {
    data: modules,
    isPending: modulesLoading,
    error: modulesError,
  } = useFetch("http://localhost:8000/api/modules")

  const selectedProjectId = formData.projectId
  const workflowsUrl = selectedProjectId
    ? `http://localhost:8000/api/workflows?project_id=${encodeURIComponent(selectedProjectId)}`
    : null
  const tagsUrl = selectedProjectId
    ? `http://localhost:8000/api/tags?project_id=${encodeURIComponent(selectedProjectId)}`
    : null

  const {
    data: workflows,
    isPending: workflowsLoading,
    error: workflowsError,
  } = useFetch(workflowsUrl)
  const {
    data: availableTags,
    isPending: tagsLoading,
    error: tagsError,
  } = useFetch(tagsUrl)

  const selectedProject = useMemo(
    () => (projects || []).find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  )

  const availableEmployees = useMemo(() => {
    if (!employees || !formData.workGroupCode) return []
    return employees.filter((employee) => employee.workgroupId === formData.workGroupCode)
  }, [employees, formData.workGroupCode])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const nextValue =
      name === "title" ? value.slice(0, MAX_TICKET_TITLE_LENGTH) : value

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
  }

  const handleProjectChange = (e) => {
    const projectId = e.target.value
    setFormData(createInitialFormData(projectId))
    setSelectedTags([])
  }

  const handleWorkflowChange = (e) => {
    const workflowId = e.target.value

    if (!workflowId) {
      setFormData((prev) => ({
        ...prev,
        workflowId: "",
        status: "",
        stepCode: "",
        workGroup: "",
        workGroupCode: "",
        responsibleEmployeeId: "",
      }))
      return
    }

    const selectedWorkflow = (workflows || []).find((workflow) => workflow.id === workflowId)
    const steps = Array.isArray(selectedWorkflow?.steps) ? [...selectedWorkflow.steps] : []
    steps.sort(
      (a, b) =>
        Number(a.stepOrder ?? a.step_order ?? 0) -
        Number(b.stepOrder ?? b.step_order ?? 0)
    )

    const firstStep = steps[0]
    if (!firstStep) {
      showToast("This workflow has no steps defined.", "error")
      setFormData((prev) => ({
        ...prev,
        workflowId: "",
        status: "",
        stepCode: "",
        workGroup: "",
        workGroupCode: "",
        responsibleEmployeeId: "",
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      workflowId,
      status: firstStep.stepName || firstStep.step_name || "",
      stepCode: firstStep.stepCode || firstStep.step_code || "",
      workGroup: firstStep.workgroupName || firstStep.workgroup_name || "",
      workGroupCode:
        firstStep.workgroupId ||
        firstStep.workgroup_id ||
        firstStep.workgroupCode ||
        firstStep.workgroup_code ||
        "",
      responsibleEmployeeId: "",
    }))
  }

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const generateTicketId = async () => {
    try {
      const response = await fetchWithAuth("http://localhost:8000/api/tickets")
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status}`)
      }

      const tickets = await response.json()
      if (!Array.isArray(tickets)) {
        throw new Error("Tickets response is not an array")
      }

      const existingNumbers = tickets
        .map((ticket) => {
          const code = ticket.ticket_code || ticket.ticketCode || ticket.id || ""
          const match = code.match(/TCK-(\d+)/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter((num) => !Number.isNaN(num))

      const highestNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000
      return `TCK-${highestNumber + 1}`
    } catch (error) {
      console.error("Error generating ticket ID:", error)
      const randomId = Math.floor(Math.random() * 9000) + 1000
      return `TCK-${randomId}`
    }
  }

  const validateForm = () => {
    if (!formData.projectId) {
      showToast("Please select a project first.", "error")
      return false
    }

    if (!formData.title.trim()) {
      showToast("Please enter a ticket title.", "error")
      return false
    }

    if (formData.title.trim().length > MAX_TICKET_TITLE_LENGTH) {
      showToast(`Title must be ${MAX_TICKET_TITLE_LENGTH} characters or fewer.`, "error")
      return false
    }

    if (!stripHtml(formData.description)) {
      showToast("Please provide a description.", "error")
      return false
    }

    if (stripHtml(formData.description).length > MAX_TICKET_DESCRIPTION_LENGTH) {
      showToast(
        `Description must be ${MAX_TICKET_DESCRIPTION_LENGTH} characters or fewer.`,
        "error"
      )
      return false
    }

    if (!formData.workflowId) {
      showToast("Please select a workflow.", "error")
      return false
    }

    if (!formData.priority) {
      showToast("Please select a priority level.", "error")
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const ticketId = await generateTicketId()
      const ticketData = {
        id: ticketId,
        title: formData.title.trim(),
        description: formData.description,
        project_id: formData.projectId,
        step_code: formData.stepCode,
        priority: formData.priority,
        workflow_id: formData.workflowId,
        workgroup_id: formData.workGroupCode || null,
        responsible_employee_id: formData.responsibleEmployeeId || null,
        module_id: formData.moduleId || null,
        tag_ids: selectedTags,
        start_date: formatDate(formData.startDate) || null,
        due_date: formatDate(formData.dueDate) || null,
      }

      const response = await fetchWithAuth("http://localhost:8000/api/tickets", {
        method: "POST",
        body: JSON.stringify(ticketData),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to create ticket (${response.status})`)
      }

      setFormData(createInitialFormData(formData.projectId))
      setSelectedTags([])
      showToast("Ticket created successfully!", "success")
    } catch (error) {
      console.error("Error creating ticket:", error)
      showToast(`Failed to create ticket: ${error.message}`, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData(createInitialFormData(formData.projectId))
    setSelectedTags([])
    showToast("Form cleared.", "info")
  }

  const isBaseLoading = projectsLoading || employeesLoading || modulesLoading
  const baseError = projectsError || employeesError || modulesError
  const isProjectDataLoading = Boolean(selectedProjectId) && (workflowsLoading || tagsLoading)
  const projectDataError = workflowsError || tagsError
  const noProjects = !projectsLoading && Array.isArray(projects) && projects.length === 0
  const descriptionCharacterCount = stripHtml(formData.description).length

  if (isBaseLoading) {
    return <CreateTicketPageSkeleton />
  }

  if (baseError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create New Ticket
          </h1>
          <p className="text-red-600 dark:text-red-400">
            Error loading setup data: {baseError}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          Start by selecting a project, then complete the ticket details.
        </p>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Step 1: Select Project</CardTitle>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Only workflows and tags assigned to the selected project will be available.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {noProjects ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
              {Number(user?.role_id) === 1
                ? "No projects are available yet. Create a project first in the admin area."
                : "No projects assigned to your workgroup. Please contact administration."}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="projectId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  id="projectId"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleProjectChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select project</option>
                  {(projects || []).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.id}){project.active ? "" : " - Inactive"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProject && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white">{selectedProject.name}</p>
                    <Badge variant={selectedProject.active ? "secondary" : "destructive"}>
                      {selectedProject.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {selectedProject.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {selectedProject.description}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedProjectId && !noProjects && (
        <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle>Step 2: Ticket Details</CardTitle>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Workflows and tags are loaded from the selected project.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProjectDataLoading ? (
              <CreateTicketStepDetailsSkeleton />
            ) : projectDataError ? (
              <p className="text-red-600 dark:text-red-400">
                Error loading project data: {projectDataError}
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={formData.title}
                      onChange={handleInputChange}
                      maxLength={MAX_TICKET_TITLE_LENGTH}
                      placeholder="Enter ticket title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.title.length}/{MAX_TICKET_TITLE_LENGTH} characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Description <span className="text-red-500">*</span>
                    </label>
                    <TicketEditor
                      value={formData.description}
                      onChange={(html) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: html,
                        }))
                      }
                      placeholder="Describe the ticket in detail"
                      maxLength={MAX_TICKET_DESCRIPTION_LENGTH}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {descriptionCharacterCount}/{MAX_TICKET_DESCRIPTION_LENGTH} characters
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="workflow"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Workflow <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="workflow"
                        name="workflowId"
                        value={formData.workflowId}
                        onChange={handleWorkflowChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select workflow</option>
                        {(workflows || []).map((workflow) => (
                          <option key={workflow.id} value={workflow.id}>
                            {workflow.name}
                          </option>
                        ))}
                      </select>
                      {Array.isArray(workflows) && workflows.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          No workflows are assigned to this project yet.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
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
                      <label
                        htmlFor="priority"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
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
                      <label
                        htmlFor="workgroup"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
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
                      <label
                        htmlFor="responsibleEmployeeId"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Person Responsible
                      </label>
                      <select
                        id="responsibleEmployeeId"
                        name="responsibleEmployeeId"
                        value={formData.responsibleEmployeeId}
                        onChange={handleInputChange}
                        disabled={!formData.workGroupCode}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-700"
                      >
                        <option value="">
                          {!formData.workGroupCode
                            ? "Select workflow first"
                            : availableEmployees.length === 0
                              ? "No employees in this workgroup"
                              : "Select person"}
                        </option>
                        {availableEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="moduleId"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Module
                      </label>
                      <select
                        id="moduleId"
                        name="moduleId"
                        value={formData.moduleId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select module</option>
                        {(modules || []).map((module) => (
                          <option key={module.id} value={module.id}>
                            {module.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tags
                    </label>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(availableTags || []).length > 0 ? (
                          availableTags.map((tag) => (
                            <Button
                              key={tag.id}
                              type="button"
                              variant={selectedTags.includes(tag.id) ? "primary" : "outline"}
                              size="sm"
                              onClick={() => toggleTag(tag.id)}
                            >
                              {tag.label}
                            </Button>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No tags are assigned to this project.
                          </p>
                        )}
                      </div>

                      {selectedTags.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Selected Tags:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {selectedTags.map((tagId) => {
                              const tag = (availableTags || []).find((item) => item.id === tagId)
                              if (!tag) return null

                              return (
                                <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                                  {tag.label}
                                  <button
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  >
                                    x
                                  </button>
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Start Date
                      </label>
                      <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="dueDate"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CreateTicketPage
