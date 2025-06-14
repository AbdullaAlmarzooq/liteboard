import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Badge from "../components/Badge"

const Dashboard = () => {
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
    { label: "Total Projects", value: "12", icon: "📊" },
    { label: "Active Tasks", value: "34", icon: "⏰" },
    { label: "Completed", value: "8", icon: "✅" },
    { label: "Team Members", value: "16", icon: "👥" }
  ]

  const getStatusVariant = status => {
    switch (status) {
      case "Completed":
        return "default"
      case "In Progress":
        return "secondary"
      case "Planning":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          LiteBoard Dashboard
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Manage your projects and track progress with ease
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.label}
              </CardTitle>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Recent Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Card key={project.id} hover>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant={getStatusVariant(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {project.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Team: {project.team}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Due: {project.dueDate}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      Progress
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
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

export default Dashboard
