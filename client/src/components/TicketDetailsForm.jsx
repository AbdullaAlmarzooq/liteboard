
const TicketDetailsForm = ({ 
  formData, 
  handleInputChange, 
  handleTagToggle, 
  tags = [], 
  statusOptions = [], 
  priorityOptions = [] 
}) => {

  // --- Card Component Structure Emulation ---
  const Card = ({ children, className = "" }) => (
    <div className={`p-6 bg-white shadow-lg rounded-xl transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
  const CardHeader = ({ children }) => <div className="mb-4">{children}</div>;
  const CardTitle = ({ children }) => <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{children}</h3>;
  const CardContent = ({ children, className = "" }) => <div className={className}>{children}</div>;
  // --- End Card Component Structure Emulation ---
  
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the ticket details..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {/* Now safe because statusOptions defaults to [] */}
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {/* Now safe because priorityOptions defaults to [] */}
                {priorityOptions.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Safe because tags defaults to [] */}
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.label)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors shadow-sm ${
                  formData.tags.includes(tag.label)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketDetailsForm;
