import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import Badge from "../components/Badge";

const AssignmentAndTimeline = ({ formData, handleInputChange, workgroups, employees, moduleOptions }) => {
  return (
    <Card className="bg-white h-fit">
      <CardHeader>
        <CardTitle>Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="workgroup"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Work Group
            </label>
            <select
              id="workgroup"
              name="workGroup"
              value={formData.workGroup}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              disabled // This is the key change
            >
              <option value="">Select work group</option>
              {workgroups && workgroups.length > 0 ? (
                workgroups.map(workgroup => (
                  <option key={workgroup.id} value={workgroup.name}>
                    {workgroup.name}
                  </option>
                ))
              ) : (
                <option disabled>No workgroups available</option>
              )}
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
              {employees && employees.length > 0 ? (
                employees.map(employee => (
                  <option key={employee.id} value={employee.name}>
                    {employee.name}
                  </option>
                ))
              ) : (
                <option disabled>No employees available</option>
              )}
            </select>
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
              {moduleOptions.map(module => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="space-y-4">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
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
      </CardContent>
    </Card>
  );
};

export default AssignmentAndTimeline;