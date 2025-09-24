import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, CheckCircle, Clock } from "lucide-react"

export default function Dashboard() {
  const projects = [
    {
      id: 1,
      name: "Website Redesign",
      description: "Complete overhaul of company website",
      status: "In Progress",
      dueDate: "2024-02-15",
      team: "Design",
      progress: 65
    },
    {
      id: 2,
      name: "Mobile App Development",
      description: "Native iOS and Android application",
      status: "Planning",
      dueDate: "2024-03-30",
      team: "Dev",
      progress: 25
    },
    {
      id: 3,
      name: "API Integration",
      description: "Third-party service integration",
      status: "Completed",
      dueDate: "2024-01-20",
      team: "Backend",
      progress: 100
    },
    {
      id: 4,
      name: "Security Audit",
      description: "Comprehensive security review",
      status: "In Progress",
      dueDate: "2024-02-28",
      team: "Ops",
      progress: 40
    }
  ]

  const stats = [
    { label: "Total Projects", value: "12", icon: Calendar },
    { label: "Active Tasks", value: "34", icon: Clock },
    { label: "Completed", value: "8", icon: CheckCircle },
    { label: "Team Members", value: "16", icon: Users }
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          LiteBoard Dashboard
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage your projects and track progress with ease
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Recent Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge
                    variant={
                      project.status === "Completed"
                        ? "default"
                        : project.status === "In Progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Team: {project.team}
                  </span>
                  <span className="text-muted-foreground">
                    Due: {project.dueDate}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
