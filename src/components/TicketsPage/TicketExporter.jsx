import { Download } from 'lucide-react';

/**
 * @param {object[]} ticketsToExport
 * @param {object} workgroupsMap - { [id]: name }
 */
const TicketExporter = ({ ticketsToExport, workgroupsMap = {} }) => {

  const convertToCsv = (data) => {
    if (!data || data.length === 0) return "";

    const headers = [
      "ID", "Title", "Description", "Status", "Priority", "WorkGroup",
      "Responsible", "Module", "Tags", "Due Date", "Initiate Date"
    ];

    const keys = [
      "id", "title", "description", "status", "priority", "workGroup",
      "responsible", "module", "tags", "dueDate", "initiateDate"
    ];

    const csvHeader = headers.join(',');

    const csvRows = data.map(ticket => {
      return keys.map(key => {
        let value;

        if (key === 'workGroup') {
          // map workgroupId to name
          value = ticket.workGroup;
        } else {
          value = ticket[key];
        }

        if (key === 'tags' && Array.isArray(value)) {
          value = value.join(';');
        }

        value = value === undefined || value === null ? '' : String(value);

        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      }).join(',');
    });

    return [csvHeader, ...csvRows].join('\n');
  };

  const handleExport = () => {
    if (!ticketsToExport || ticketsToExport.length === 0) {
      alert("No tickets available to export.");
      return;
    }

    const csvContent = convertToCsv(ticketsToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "liteboard-tickets.csv"); 
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center justify-center px-6 py-3 bg-green-100 text-green-700 font-semibold rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700 dark:focus:ring-green-400 dark:focus:ring-offset-gray-900 transition-all duration-200"
      disabled={!ticketsToExport || ticketsToExport.length === 0}
    >
      <span className="mr-2"><Download /></span>
      Export to CSV
    </button>
  );
};

export default TicketExporter;