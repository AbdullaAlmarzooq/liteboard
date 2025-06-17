"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Button from "../components/Button"
import Badge from "../components/Badge"
import useFetch from "../useFetch"


const CreateTicketPage = () => {
  const [selectedTags, setSelectedTags] = useState([])
  const [customTag, setCustomTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "",
    priority: "",
    workGroup: "",
    responsible: "",
    module: "",
    startDate: "",
    dueDate: ""
  })

  const { data: availableTags, isPending: tagsLoading, error: tagsError } = useFetch('http://localhost:8000/tags')

    const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

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
          const response = await fetch('http://localhost:8000/tags', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              label: newTag,
            })
          })
          
          if (!response.ok) {
            console.error('Failed to add tag to database')
          }
        } catch (error) {
          console.error('Error adding tag:', error)
        }
      }
      
      setCustomTag("")
    }
  }

  const deleteTagFromDB = async (tagId) => {
    try {
      const response = await fetch(`http://localhost:8000/tags/${tagId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        console.error('Failed to delete tag from database')
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  const generateTicketId = async () => {
    try {
      const response = await fetch('http://localhost:8000/tickets')
      const tickets = await response.json()
      
      const existingNumbers = tickets
        .map(ticket => {
          const match = ticket.id.match(/TCK-(\d+)/)
          return match ? parseInt(match[1]) : 0
        })
        .filter(num => !isNaN(num))
      
      const highestNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000
      const nextNumber = highestNumber + 1
      
      return `TCK-${nextNumber}`
    } catch (error) {
      console.error('Error generating ticket ID:', error)
      const randomId = Math.floor(Math.random() * 9000) + 1000
      return `TCK-${randomId}`
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    
    // If it's already in the correct format, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString
    }
    
    // If it's in DD/MM/YYYY format, convert to YYYY-MM-DD
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      const [day, month, year] = dateString.split('/')[0].split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return dateString
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.title.trim()) {
        alert('Please enter a title')
        setIsSubmitting(false)
        return
      }

      if (!formData.status) {
        alert('Please select a status')
        setIsSubmitting(false)
        return
      }

      if (!formData.priority) {
        alert('Please select a priority')
        setIsSubmitting(false)
        return
      }

      const ticketId = await generateTicketId()

      const now = new Date()
      const bahrainTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bahrain"}))
      const initiateDate = bahrainTime.toISOString().slice(0, 19).replace('T', ' ') // Format: YYYY-MM-DD HH:MM:SS

      const ticketData = {
        id: ticketId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        workGroup: formData.workGroup,
        responsible: formData.responsible,
        module: formData.module,
        tags: selectedTags,
        startDate: formatDate(formData.startDate),
        dueDate: formatDate(formData.dueDate),
        initiateDate: initiateDate
      }

      const response = await fetch('http://localhost:8000/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Ticket created successfully:', result)
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        status: "",
        priority: "",
        workGroup: "",
        responsible: "",
        module: "",
        startDate: "",
        dueDate: ""
      })
      setSelectedTags([])
      
      alert('Ticket created successfully!')
      
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert(`Error creating ticket: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: "",
      description: "",
      status: "",
      priority: "",
      workGroup: "",
      responsible: "",
      module: "",
      startDate: "",
      dueDate: ""
    })
    setSelectedTags([])
    setCustomTag("")
  }

    if (tagsLoading) {
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

  if (tagsError) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create New Ticket
          </h1>
          <p className="text-red-600 dark:text-red-400">
            Error loading tags: {tagsError.message}
          </p>
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Create New Ticket
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Fill out the form below to create a new project ticket
        </p>
      </div>

      <Card>
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
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Title
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
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description
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
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="workgroup"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Work Group Assigned
              </label>
              <select
                id="workgroup"
                name="workGroup"
                value={formData.workGroup}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select work group</option>
                <option value="it">IT</option>
                <option value="dev">Dev</option>
                <option value="design">Design</option>
                <option value="ops">Ops</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="responsible"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Person Responsible
              </label>
              <select
                id="responsible"
                name="responsible"
                value={formData.responsible}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select person</option>
                <option value="Abdulla">Abdulla</option>
                <option value="Ali">Ali</option>
                <option value="Mohammed">Mohammed</option>
                <option value="Hussain">Hussain</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="module"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
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
              <option value="auth">Auth</option>
              <option value="ui">UI</option>
              <option value="backend">Backend</option>
              <option value="api">API</option>
            </select>
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

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom tag"
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <Button type="button" variant="outline" onClick={addCustomTag}>
                  Add
                </Button>
              </div>

              {selectedTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Tags:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <div key={tag} className="flex items-center">
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
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
              <label
                htmlFor="startdate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Start Date
              </label>
              <input
                id="startdate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange}
                placeholder="DD/MM/YYYY HH:MM:SS"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Format: DD/MM/YYYY HH:MM:SS (Bahrain time)
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="duedate"
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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Format: DD/MM/YYYY
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button type="submit" className="flex-1">
              Create Ticket
            </Button>
            <Button type="button" variant="outline">
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
