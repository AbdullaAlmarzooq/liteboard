import { Card, CardContent, CardHeader, CardTitle } from "../Card";

const AssignmentAndTimeline = ({ formData, handleInputChange, workgroups, employees, moduleOptions }) => {
  // Filter employees by current workGroup
  const eligibleEmployees = employees
    ? employees.filter(emp => String(emp.workgroupId) === String(formData.workgroupId))
    : [];

  return (
    <Card className="bg-white h-fit">
      <CardHeader>
        <CardTitle>Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workgroup (disabled, auto-assigned via workflow) */}
        <div>
          <label
            htmlFor="workgroup"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            WorkGroup
          </label>
          <select
            id="workgroup"
            name="workGroup"
            value={formData.workGroup}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled
          >
            <option value="">Select work group</option>
            {workgroups?.length > 0 ? (
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

        {/* Responsible dropdown */}
        <div>
          <label
            htmlFor="responsible"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Person Responsible
          </label>
          <select
            id="responsible"
            name="responsibleEmployeeId"
            value={formData.responsibleEmployeeId || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select person</option>
            {eligibleEmployees.length > 0 ? (
              eligibleEmployees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))
            ) : (
              <option disabled>No employees available</option>
            )}
          </select>
        </div>

        {/* Module dropdown - FIXED to use module ID */}
        <div>
          <label
            htmlFor="module"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Module
          </label>
          <select
            id="module"
            name="module"
            value={formData.moduleId || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select module</option>
            {moduleOptions && moduleOptions.length > 0 ? (
              moduleOptions.map(module => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))
            ) : (
              <option disabled>No modules available</option>
            )}
          </select>
        </div>

        {/* Timeline Section */}
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <div>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentAndTimeline;