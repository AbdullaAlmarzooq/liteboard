import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default function TicketsPage() {
  const tickets = [
    {
      id: "T-001",
      title: "Fix login authentication bug",
      status: "In Progress",
      priority: "High",
      workGroup: "Dev",
      responsible: "John Smith",
      module: "Auth",
      tags: ["bug", "urgent"],
      startDate: "15/01/2024 09:00:00",
      dueDate: "20/01/2024"
    },
    {
      id: "T-002",
      title: "Design new dashboard layout",
      status: "Todo",
      priority: "Medium",
      workGroup: "Design",
      responsible: "Sarah Johnson",
      module: "UI",
      tags: ["feature", "design"],
      startDate: "16/01/2024 10:30:00",
      dueDate: "25/01/2024"
    },
    {
      id: "T-003",
      title: "Implement API rate limiting",
      status: "Done",
      priority: "Critical",
      workGroup: "Backend",
      responsible: "Mike Wilson",
      module: "API",
      tags: ["security", "performance"],
      startDate: "10/01/2024 08:00:00",
      dueDate: "18/01/2024"
    },
    {
      id: "T-004",
      title: "Update user documentation",
      status: "In Progress",
      priority: "Low",
      workGroup: "Ops",
      responsible: "Lisa Chen",
      module: "Backend",
      tags: ["documentation"],
      startDate: "12/01/2024 14:00:00",
      dueDate: "30/01/2024"
    }
  ]

  const getStatusColor = status => {
    switch (status) {
      case "Done":
        return "default"
      case "In Progress":
        return "secondary"
      case "Todo":
        return "outline"
      default:
        return "outline"
    }
  }

  const getPriorityColor = priority => {
    switch (priority) {
      case "Critical":
        return "destructive"
      case "High":
        return "destructive"
      case "Medium":
        return "secondary"
      case "Low":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            Manage and track all project tickets
          </p>
        </div>
        <Button asChild>
          <Link href="/create-ticket">
            <Plus className="mr-2 h-4 w-4" />
            Create Ticket
          </Link>
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">ID</th>
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Priority</th>
                    <th className="text-left p-2 font-medium">Work Group</th>
                    <th className="text-left p-2 font-medium">Responsible</th>
                    <th className="text-left p-2 font-medium">Module</th>
                    <th className="text-left p-2 font-medium">Tags</th>
                    <th className="text-left p-2 font-medium">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-sm">{ticket.id}</td>
                      <td className="p-2 font-medium">{ticket.title}</td>
                      <td className="p-2">
                        <Badge variant={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="p-2">{ticket.workGroup}</td>
                      <td className="p-2">{ticket.responsible}</td>
                      <td className="p-2">{ticket.module}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {ticket.tags.map(tag => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 text-sm">{ticket.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {tickets.map(ticket => (
          <Card key={ticket.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">
                  {ticket.id}
                </span>
                <div className="flex gap-2">
                  <Badge variant={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                  <Badge variant={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg">{ticket.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Work Group:</span>
                  <div className="font-medium">{ticket.workGroup}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Module:</span>
                  <div className="font-medium">{ticket.module}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Responsible:</span>
                  <div className="font-medium">{ticket.responsible}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <div className="font-medium">{ticket.dueDate}</div>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ticket.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
