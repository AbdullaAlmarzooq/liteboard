import { useState } from "react";
import { Download } from "lucide-react";
import { appendTicketFilterParams } from "./ticketFilterQuery";

const TicketExporter = ({
  selectedProjectId = "",
  activeFilters = {},
  totalItems = 0,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const extractTagNames = (tags) => {
    if (!tags || !Array.isArray(tags)) return "";

    return tags
      .map((tag) => {
        if (typeof tag === "string") return tag;
        if (typeof tag === "object" && tag.name) return tag.name;
        if (typeof tag === "object" && tag.label) return tag.label;
        return "Unknown Tag";
      })
      .join(";");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const convertToCsv = (data) => {
    if (!data || data.length === 0) return "";

    const headers = [
      "Ticket Code",
      "Project",
      "Workflow",
      "Title",
      "Description",
      "Status",
      "Priority",
      "WorkGroup",
      "Responsible",
      "Module",
      "Tags",
      "Due Date",
      "Created At",
    ];

    const csvHeader = headers.join(",");

    const csvRows = data.map((ticket) => {
      const row = [
        ticket.ticket_code || ticket.id || "",
        ticket.project_name || "",
        ticket.workflow_name || "No Workflow",
        ticket.title || "",
        ticket.description || "",
        ticket.status || "",
        ticket.priority || "",
        ticket.workgroup_name || "Unassigned",
        ticket.responsible_name || "Unassigned",
        ticket.module_name || "No Module",
        extractTagNames(ticket.tags),
        formatDate(ticket.due_date),
        formatDate(ticket.created_at),
      ];

      return row
        .map((value) => {
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes("\"") ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, "\"\"")}"`;
          }
          return stringValue;
        })
        .join(",");
    });

    return [csvHeader, ...csvRows].join("\n");
  };

  const handleExport = async () => {
    if (totalItems <= 0) {
      alert("No tickets available to export.");
      return;
    }

    setIsExporting(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (selectedProjectId) {
        params.set("project_id", selectedProjectId);
      }
      appendTicketFilterParams(params, activeFilters);

      const response = await fetch(`http://localhost:8000/api/tickets/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch ticket export data");
      }

      const payload = await response.json();
      const items = Array.isArray(payload.items) ? payload.items : [];

      if (!items.length) {
        alert("No tickets match the selected filters.");
        return;
      }

      const csvContent = convertToCsv(items);
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `liteboard-tickets-${timestamp}.csv`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting tickets:", error);
      alert("Failed to export tickets. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center justify-center px-6 py-3 bg-green-100 text-green-700 font-semibold rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700 dark:focus:ring-green-400 dark:focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={totalItems <= 0 || isExporting}
      title={
        totalItems > 0
          ? `Export ${totalItems} ticket${totalItems !== 1 ? "s" : ""} to CSV`
          : "No tickets to export"
      }
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? "Exporting..." : "Export to CSV"}
      {totalItems > 0 && !isExporting && (
        <span className="ml-2 px-2 py-1 text-xs bg-green-200 dark:bg-green-700 rounded-full">
          {totalItems}
        </span>
      )}
    </button>
  );
};

export default TicketExporter;
