"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Button from "../components/Button"
import Badge from "../components/Badge"
import useFetch from "../useFetch"


const CreateTicketPage = () => {
  const [selectedTags, setSelectedTags] = useState([])
  const [customTag, setCustomTag] = useState("")

  const { data: availableTags, isPending: tagsLoading, error: tagsError } = useFetch('http://localhost:8000/tags')


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
      
      // Add to selected tags
      addTag(newTag)
      
      // Check if tag already exists in available tags
      const existingTags = availableTags || []
      if (!existingTags.some(tag => tag.label === newTag)) {
        // Add new tag to database
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
        // Force refresh by reloading the page or refetching
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
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

  // Show error state
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
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
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
              rows={4}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select status</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select person</option>
                <option value="john-smith">John Smith</option>
                <option value="sarah-johnson">Sarah Johnson</option>
                <option value="mike-wilson">Mike Wilson</option>
                <option value="lisa-chen">Lisa Chen</option>
                <option value="david-brown">David Brown</option>
                <option value="emma-davis">Emma Davis</option>
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
                type="text"
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
                id="duedate"
                type="text"
                placeholder="DD/MM/YYYY"
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
        </CardContent>
      </Card>
    </div>
  )
}

export default CreateTicketPage
