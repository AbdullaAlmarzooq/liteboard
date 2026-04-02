import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import Badge from "../components/Badge";
import useFetch from "../useFetch";
import { useAuth } from "../components/hooks/useAuth";
import { ProjectsPageSkeleton } from "../components/PageSkeletons";

const STAT_ITEMS = [
  { key: "open_count", label: "Open", variant: "default" },
  { key: "in_progress_count", label: "In Progress", variant: "secondary" },
  { key: "closed_count", label: "Closed", variant: "new" },
  { key: "cancelled_count", label: "Cancelled", variant: "destructive" },
];

const toCount = (value) => Number.parseInt(value ?? 0, 10) || 0;

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data: dashboardProjects,
    isPending,
    error,
  } = useFetch("http://localhost:8000/api/projects/dashboard");

  const projects = useMemo(
    () => (Array.isArray(dashboardProjects) ? dashboardProjects : []),
    [dashboardProjects]
  );

  if (isPending) {
    return <ProjectsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">
          Error loading projects overview: {error.toString()}
        </div>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Projects Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {user?.role_id === 1
              ? "No projects are available yet."
              : "No projects assigned to your workgroup. Please contact administration."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Projects Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Review ticket volume by project and jump straight into a filtered ticket list.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            hover
            className="cursor-pointer bg-white dark:bg-gray-800 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700"
          >
            <button
              type="button"
              onClick={() => navigate(`/tickets?project_id=${project.id}`)}
              className="w-full text-left"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <FolderOpen className="w-4 h-4" />
                      <span>{project.id}</span>
                    </div>
                    <CardTitle>{project.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span>View Tickets</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {project.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {STAT_ITEMS.map((stat) => (
                    <div
                      key={stat.key}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                    >
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {stat.label}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {toCount(project[stat.key])}
                        </span>
                        <Badge variant={stat.variant}>{stat.label}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProjectsPage;
