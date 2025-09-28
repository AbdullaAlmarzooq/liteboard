import { Download } from 'lucide-react';

/**
 * TicketExporter component for exporting tickets to CSV
 * @param {object[]} ticketsToExport - Array of ticket objects to export
 */
const TicketExporter = ({ ticketsToExport = [] }) => {

  // Helper function to extract tag names from normalized tag structure
  const extractTagNames = (tags) => {
    if (!tags || !Array.isArray(tags)) return '';
    
    return tags.map(tag => {
      // Handle both old format (strings) and new format (objects)
      if (typeof tag === 'string') return tag;
      if (typeof tag === 'object' && tag.name) return tag.name;
      if (typeof tag === 'object' && tag.label) return tag.label; // fallback
      return 'Unknown Tag';
    }).join(';');
  };

  // Helper function to format dates consistently
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString; // Return original if parsing fails
    }
  };

  const convertToCsv = (data) => {
    if (!data || data.length === 0) return "";

    const headers = [
      "ID", "Title", "Description", "Status", "Priority", "WorkGroup",
      "Responsible", "Module", "Tags", "Due Date", "Initiate Date"
    ];

    const csvHeader = headers.join(',');

    const csvRows = data.map(ticket => {
      const row = [
        ticket.id || '',
        ticket.title || '',
        ticket.description || '',
        ticket.status || '',
        ticket.priority || '',
        ticket.workGroup || 'Unassigned',
        ticket.responsible || 'Unassigned',
        ticket.module || 'No Module',
        extractTagNames(ticket.tags), // Handle normalized tags
        formatDate(ticket.dueDate),
        formatDate(ticket.initiateDate)
      ];

      // Escape CSV values that contain commas, quotes, or newlines
      return row.map(value => {
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    return [csvHeader, ...csvRows].join('\n');
  };

  const handleExport = () => {
    if (!ticketsToExport || ticketsToExport.length === 0) {
      alert("No tickets available to export.");
      return;
    }

    try {
      const csvContent = convertToCsv(ticketsToExport);
      
      // Add BOM for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      link.setAttribute("href", url);
      link.setAttribute("download", `liteboard-tickets-${timestamp}.csv`); 
      
      // Ensure link is added to DOM for Firefox compatibility
      document.body.appendChild(link); 
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Exported ${ticketsToExport.length} tickets to CSV`);
    } catch (error) {
      console.error('Error exporting tickets:', error);
      alert('Failed to export tickets. Please try again.');
    }
  };

  const ticketCount = ticketsToExport ? ticketsToExport.length : 0;

  return (
    <button
      onClick={handleExport}
      className="flex items-center justify-center px-6 py-3 bg-green-100 text-green-700 font-semibold rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700 dark:focus:ring-green-400 dark:focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={!ticketsToExport || ticketsToExport.length === 0}
      title={ticketCount > 0 ? `Export ${ticketCount} ticket${ticketCount !== 1 ? 's' : ''} to CSV` : 'No tickets to export'}
    >
      <Download className="w-4 h-4 mr-2" />
      Export to CSV
      {ticketCount > 0 && (
        <span className="ml-2 px-2 py-1 text-xs bg-green-200 dark:bg-green-700 rounded-full">
          {ticketCount}
        </span>
      )}
    </button>
  );
};

export default TicketExporter;