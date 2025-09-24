"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export default function CreateTicketPage() {
  const [selectedTags, setSelectedTags] = useState([])
  const [customTag, setCustomTag] = useState("")

  const availableTags = [
    "urgent",
    "feature",
    "bug",
    "enhancement",
    "documentation",
    "security",
    "performance",
    "ui",
    "backend"
  ]

  const addTag = tag => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const removeTag = tag => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim().toLowerCase())
      setCustomTag("")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
        <p className="text-muted-foreground">
          Fill out the form below to create a new project ticket
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
          <CardDescription>
            Provide all necessary information for the new ticket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter ticket title"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the ticket in detail"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workgroup">Work Group Assigned</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select work group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="dev">Dev</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="ops">Ops</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Person Responsible</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="john-smith">John Smith</SelectItem>
                  <SelectItem value="sarah-johnson">Sarah Johnson</SelectItem>
                  <SelectItem value="mike-wilson">Mike Wilson</SelectItem>
                  <SelectItem value="lisa-chen">Lisa Chen</SelectItem>
                  <SelectItem value="david-brown">David Brown</SelectItem>
                  <SelectItem value="emma-davis">Emma Davis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="module">Module</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="ui">UI</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Tags</Label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Button
                    key={tag}
                    type="button"
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      selectedTags.includes(tag) ? removeTag(tag) : addTag(tag)
                    }
                  >
                    {tag}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag"
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  onKeyPress={e =>
                    e.key === "Enter" && (e.preventDefault(), addCustomTag())
                  }
                />
                <Button type="button" variant="outline" onClick={addCustomTag}>
                  Add
                </Button>
              </div>

              {selectedTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Selected Tags:</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startdate">Start Date</Label>
              <Input
                id="startdate"
                placeholder="DD/MM/YYYY HH:MM:SS"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Format: DD/MM/YYYY HH:MM:SS (Bahrain time)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duedate">Due Date</Label>
              <Input id="duedate" placeholder="DD/MM/YYYY" className="w-full" />
              <p className="text-xs text-muted-foreground">
                Format: DD/MM/YYYY
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
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
