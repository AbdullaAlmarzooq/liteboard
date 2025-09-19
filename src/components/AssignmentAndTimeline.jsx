import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";

const AssignmentAndTimeline = ({ formData, handleInputChange, workgroups, employees, moduleOptions }) => {
  // ✅ Filter employees by current workGroup (name)
  const eligibleEmployees = employees
    ? employees.filter(emp => emp.workgroupCode === formData.workGroup)
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            name="responsible"
            value={formData.responsible}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select person</option>
            {eligibleEmployees.length > 0 ? (
              eligibleEmployees.map(employee => (
                <option key={employee.id} value={employee.name}>
                  {employee.name}
                </option>
              ))
            ) : (
              <option disabled>No employees available</option>
            )}
          </select>
        </div>

        {/* Module dropdown */}
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
            value={formData.module}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select module</option>
            {moduleOptions.map(module => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentAndTimeline;
