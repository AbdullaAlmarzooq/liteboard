import React from "react";
import { Card, CardContent, CardHeader } from "./Card";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
);

const ProfileTableCardSkeleton = ({ titleWidth = "w-40", rows = 4 }) => (
  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
    <CardHeader>
      <SkeletonBlock className={`h-7 ${titleWidth}`} />
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {Array.from({ length: 6 }).map((_, index) => (
                <th key={`profile-header-${index}`} className="px-4 py-2 text-left">
                  <SkeletonBlock className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={`profile-row-${rowIndex}`}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                {Array.from({ length: 6 }).map((__, colIndex) => (
                  <td key={`profile-cell-${rowIndex}-${colIndex}`} className="px-4 py-3">
                    <SkeletonBlock className={colIndex === 1 ? "h-4 w-24" : "h-4 w-16"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

export const CreateTicketPageSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="space-y-2">
      <SkeletonBlock className="h-9 w-56" />
      <SkeletonBlock className="h-5 w-80" />
    </div>

    <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
      <CardHeader className="space-y-2">
        <SkeletonBlock className="h-7 w-44" />
        <SkeletonBlock className="h-4 w-96" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-10 w-full rounded-md" />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-6 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export const CreateTicketStepDetailsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="space-y-2">
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-10 w-full rounded-md" />
    </div>

    <div className="space-y-2">
      <SkeletonBlock className="h-4 w-28" />
      <div className="rounded-md border border-gray-300 dark:border-gray-600 p-3 space-y-3">
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-8 rounded-md" />
          <SkeletonBlock className="h-8 w-8 rounded-md" />
          <SkeletonBlock className="h-8 w-8 rounded-md" />
          <SkeletonBlock className="h-8 w-16 rounded-md" />
        </div>
        <SkeletonBlock className="h-28 w-full rounded-md" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`details-skeleton-${index}`} className="space-y-2">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>

    <div className="space-y-3">
      <SkeletonBlock className="h-4 w-16" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={`detail-tag-${index}`} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    </div>

    <div className="flex justify-end gap-3 pt-2">
      <SkeletonBlock className="h-10 w-24 rounded-md" />
      <SkeletonBlock className="h-10 w-32 rounded-md" />
    </div>
  </div>
);

export const ProfilePageSkeleton = () => (
  <div className="p-8 space-y-8">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <SkeletonBlock className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-8 w-40" />
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-4 w-60" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-40 rounded-lg" />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`stat-skeleton-${index}`}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col justify-center items-center transition-colors duration-200"
        >
          <SkeletonBlock className="mb-3 h-6 w-6 rounded-sm" />
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-1 h-10 w-16" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card
          key={`chart-skeleton-${index}`}
          className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <CardHeader className="space-y-2">
            <SkeletonBlock className="h-7 w-40" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex h-full items-end justify-between gap-4">
                <SkeletonBlock className="h-24 w-10 rounded-t-md" />
                <SkeletonBlock className="h-36 w-10 rounded-t-md" />
                <SkeletonBlock className="h-28 w-10 rounded-t-md" />
                <SkeletonBlock className="h-44 w-10 rounded-t-md" />
                <SkeletonBlock className="h-20 w-10 rounded-t-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ProfileTableCardSkeleton titleWidth="w-44" />
      <ProfileTableCardSkeleton titleWidth="w-36" />
    </div>
  </div>
);

export const ProjectsPageSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <SkeletonBlock className="h-9 w-64" />
        <SkeletonBlock className="h-5 w-96" />
      </div>
      <SkeletonBlock className="h-6 w-24 rounded-full" />
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card
          key={`project-page-skeleton-${index}`}
          className="bg-white dark:bg-gray-800"
        >
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-4 w-4 rounded-sm" />
                  <SkeletonBlock className="h-4 w-16" />
                </div>
                <SkeletonBlock className="h-7 w-40" />
              </div>
              <div className="flex items-center gap-1">
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-4 w-4 rounded-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((__, statIndex) => (
                <div
                  key={`project-stat-skeleton-${index}-${statIndex}`}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <SkeletonBlock className="h-4 w-20" />
                  <div className="mt-2 flex items-center gap-2">
                    <SkeletonBlock className="h-8 w-8" />
                    <SkeletonBlock className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const TicketsPageSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-9 w-32" />
        <SkeletonBlock className="h-5 w-96" />
      </div>
      <div className="flex gap-3">
        <SkeletonBlock className="h-10 w-36 rounded-md" />
      </div>
    </div>

    <div className="flex items-center gap-2 mb-4">
      <SkeletonBlock className="h-10 w-36 rounded-md" />
      <SkeletonBlock className="h-4 w-24" />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-16" />
        <SkeletonBlock className="h-10 w-[260px] rounded-md" />
      </div>
    </div>

    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm items-center animate-pulse">
      <SkeletonBlock className="h-12 flex-grow w-full rounded-md" />
      <SkeletonBlock className="h-12 w-28 rounded-md" />
    </div>

    <div className="hidden lg:block">
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <div className="h-6" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto animate-pulse">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700">
                  {["w-12", "w-20", "w-16", "w-16", "w-24", "w-24", "w-20", "w-16", "w-16", "w-20"].map((width, index) => (
                    <th key={`ticket-header-${index}`} className="text-left p-3 font-medium">
                      <SkeletonBlock className={`h-4 ${width}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr
                    key={`ticket-row-${rowIndex}`}
                    className="border-b border-gray-300 dark:border-gray-600"
                  >
                    <td className="p-3">
                      <SkeletonBlock className="h-4 w-16" />
                    </td>
                    <td className="p-3">
                      <SkeletonBlock className="h-5 w-40" />
                    </td>
                    <td className="p-3">
                      <SkeletonBlock className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="p-3">
                      <SkeletonBlock className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="p-3">
                      <SkeletonBlock className="h-4 w-24" />
                    </td>
                    <td className="p-3">
                      <SkeletonBlock className="h-4 w-24" />
                    </td>
                    <td className="p-3">
                      <SkeletonBlock className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <SkeletonBlock className="h-6 w-14 rounded-full" />
                        <SkeletonBlock className="h-6 w-12 rounded-full" />
                      </div>
                    </td>
                    <td className="p-3">
                      <SkeletonBlock className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <SkeletonBlock className="h-7 w-7 rounded" />
                        <SkeletonBlock className="h-7 w-7 rounded" />
                        <SkeletonBlock className="h-7 w-7 rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="flex justify-between items-center">
      <SkeletonBlock className="h-4 w-28" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-9 w-24 rounded-md" />
        <SkeletonBlock className="h-9 w-24 rounded-md" />
      </div>
    </div>
  </div>
);

export const DashboardPageSkeleton = () => (
  <div className="p-8 space-y-8">
    <div className="space-y-2">
      <SkeletonBlock className="h-9 w-40" />
      <SkeletonBlock className="h-5 w-96" />
    </div>

    <div className="flex justify-start mb-4">
      <SkeletonBlock className="h-10 w-32 rounded-md" />
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8 flex flex-col gap-4 justify-start transition-colors duration-200 animate-pulse">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock
            key={`dashboard-filter-${index}`}
            className="h-10 w-28 rounded-md"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock
            key={`dashboard-badge-${index}`}
            className="h-6 w-24 rounded-full"
          />
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={`dashboard-summary-${index}`}
          className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <CardHeader className="space-y-2">
            <SkeletonBlock className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <div className="h-56 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              {index === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <SkeletonBlock className="h-6 w-24" />
                  <SkeletonBlock className="h-16 w-16 rounded-full" />
                  <SkeletonBlock className="h-8 w-20" />
                </div>
              ) : (
                <div className="flex h-full items-end justify-between gap-3">
                  <SkeletonBlock className="h-16 w-10 rounded-t-md" />
                  <SkeletonBlock className="h-24 w-10 rounded-t-md" />
                  <SkeletonBlock className="h-32 w-10 rounded-t-md" />
                  <SkeletonBlock className="h-20 w-10 rounded-t-md" />
                  <SkeletonBlock className="h-28 w-10 rounded-t-md" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={`dashboard-chart-${index}`}
          className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <CardHeader className="space-y-2">
            <SkeletonBlock className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="h-64 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="flex h-full items-end justify-between gap-3">
                <SkeletonBlock className="h-20 w-10 rounded-t-md" />
                <SkeletonBlock className="h-32 w-10 rounded-t-md" />
                <SkeletonBlock className="h-24 w-10 rounded-t-md" />
                <SkeletonBlock className="h-40 w-10 rounded-t-md" />
                <SkeletonBlock className="h-28 w-10 rounded-t-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-6">
      <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="space-y-2">
          <SkeletonBlock className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="h-72 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="flex h-full items-end justify-between gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock
                  key={`dashboard-line-${index}`}
                  className={`w-8 rounded-t-md ${
                    index % 2 === 0 ? "h-24" : "h-40"
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export const ProfileSectionCardSkeleton = ({
  titleWidth = "w-40",
  columns = 6,
  rows = 4,
}) => (
  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
    <CardHeader>
      <SkeletonBlock className={`h-7 ${titleWidth}`} />
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={`section-header-${index}`} className="px-4 py-2 text-left">
                  <SkeletonBlock className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={`section-row-${rowIndex}`}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                {Array.from({ length: columns }).map((__, colIndex) => (
                  <td key={`section-cell-${rowIndex}-${colIndex}`} className="px-4 py-3">
                    <SkeletonBlock className={colIndex === 1 ? "h-4 w-24" : "h-4 w-16"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);
