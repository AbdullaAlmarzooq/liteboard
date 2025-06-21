
/**
 * @param {object[]} ticketsToExport
 */
const TicketExporter = ({ ticketsToExport }) => {

  /**
   * @param {object[]} data 
   * @returns {string} 
   */
  const convertToCsv = (data) => {
    if (!data || data.length === 0) {
      return ""; 
    }


    const headers = [
      "ID", "Title", "Description", "Status", "Priority", "Work Group",
      "Responsible", "Module", "Tags", "Due Date", "Initiate Date"
    ];


    const keys = [
      "id", "title", "description", "status", "priority", "workGroup",
      "responsible", "module", "tags", "dueDate", "initiateDate"
    ];


    const csvHeader = headers.join(',');

    const csvRows = data.map(ticket => {
      return keys.map(key => {
        let value = ticket[key];
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

      console.warn("No tickets to export.");
      alert("No tickets available to export."); 
      return;
    }

    const csvContent = convertToCsv(ticketsToExport);
    if (!csvContent) {
        console.error("Failed to generate CSV content.");
        alert("Error generating export file.");
        return;
    }


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
      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200"
      disabled={!ticketsToExport || ticketsToExport.length === 0}
    >
      <span className="mr-2">⬇️</span>
      Export to CSV
    </button>
  );
};

export default TicketExporter;
