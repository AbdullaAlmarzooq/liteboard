import React from 'react';

const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
);

export const EmployeesTabSkeleton = () => (
  <div className="grid gap-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={`employee-skeleton-${index}`}
        className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-6 w-14 rounded-full" />
          </div>

          <div className="flex space-x-2">
            <SkeletonBlock className="h-4 w-4 rounded-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-5 w-52" />
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
      </div>
    ))}
  </div>
);

export const TagsTabSkeleton = () => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="overflow-x-auto animate-pulse">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="px-6 py-3 text-left">
              <SkeletonBlock className="h-3 w-10" />
            </th>
            <th className="px-6 py-3 text-right">
              <div className="flex justify-end">
                <SkeletonBlock className="h-3 w-14" />
              </div>
            </th>
          </tr>
        </thead>

        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <tbody key={`tag-group-skeleton-${groupIndex}`}>
            <tr className="sticky top-0 z-10">
              <td
                colSpan={2}
                className="border-y border-gray-200 bg-gray-50 px-6 py-2 dark:border-gray-700 dark:bg-gray-900/80"
              >
                <SkeletonBlock className="h-3 w-28" />
              </td>
            </tr>

            {Array.from({ length: 3 }).map((__, rowIndex) => (
              <tr
                key={`tag-row-skeleton-${groupIndex}-${rowIndex}`}
                className="border-b border-gray-100 align-top dark:border-gray-700/80"
              >
                <td className="px-6 py-2.5">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-7 w-24 rounded-full" />
                  </div>
                </td>

                <td className="px-6 py-2.5">
                  <div className="flex justify-end gap-2">
                    <SkeletonBlock className="h-9 w-9 rounded-md" />
                    <SkeletonBlock className="h-9 w-9 rounded-md" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  </div>
);

export const WorkgroupsTabSkeleton = () => (
  <div className="grid gap-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={`workgroup-skeleton-${index}`}
        className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-4 shadow-sm"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2" />
          <div className="flex space-x-2">
            <SkeletonBlock className="h-4 w-4 rounded-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-36" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

export const ModulesTabSkeleton = () => (
  <div className="grid gap-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={`module-skeleton-${index}`}
        className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2" />
          <div className="flex space-x-2">
            <SkeletonBlock className="h-4 w-4 rounded-sm" />
          </div>
        </div>

        <div className="mt-2 space-y-2">
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

export const WorkflowsTabSkeleton = () => (
  <div className="grid gap-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`workflow-skeleton-${index}`}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <SkeletonBlock className="h-7 w-40" />
          </div>
          <div className="flex space-x-2 items-center">
            <SkeletonBlock className="h-4 w-4 rounded-sm" />
            <SkeletonBlock className="h-6 w-12 rounded-full" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
        </div>

        <SkeletonBlock className="h-4 w-16" />
      </div>
    ))}
  </div>
);

export const ProjectsTabSkeleton = () => (
  <div className="grid gap-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={`project-skeleton-${index}`}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBlock className="h-7 w-40" />
              <SkeletonBlock className="h-4 w-14" />
            </div>

            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md bg-gray-50 dark:bg-gray-900/40 px-3 py-2 space-y-2">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-6 w-8" />
              </div>
              <div className="rounded-md bg-gray-50 dark:bg-gray-900/40 px-3 py-2 space-y-2">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-6 w-8" />
              </div>
            </div>
          </div>

          <div className="flex space-x-2 items-center">
            <SkeletonBlock className="h-4 w-4 rounded-sm" />
            <SkeletonBlock className="h-6 w-12 rounded-full" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
