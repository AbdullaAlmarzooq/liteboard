import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const ACTIVE_TICKET_CATEGORY_CODES = new Set([10, 20]);
const ACTIVE_TICKET_CATEGORY_NAMES = new Set(["open", "in progress"]);
const ACTIVE_TICKET_STATUS_VARIANTS = new Set(["default", "secondary"]);

const TicketPriorityChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      const normalizePriority = (value) => {
        const normalized = String(value || "").trim().toLowerCase();
        if (normalized === "critical") return "Critical";
        if (normalized === "high") return "High";
        if (normalized === "medium") return "Medium";
        if (normalized === "low") return "Low";
        return null;
      };

      const activeTickets = tickets.filter((ticket) => {
        const categoryCode = Number(
          ticket.step_category_code ?? ticket.stepCategoryCode ?? ticket.category_code ?? ticket.categoryCode
        );

        if (ACTIVE_TICKET_CATEGORY_CODES.has(categoryCode)) {
          return true;
        }

        const statusVariant = String(ticket.status_variant ?? ticket.statusVariant ?? "")
          .trim()
          .toLowerCase();

        if (ACTIVE_TICKET_STATUS_VARIANTS.has(statusVariant)) {
          return true;
        }

        const categoryName = String(ticket.category ?? ticket.categoryName ?? ticket.status ?? "")
          .trim()
          .toLowerCase();

        return ACTIVE_TICKET_CATEGORY_NAMES.has(categoryName);
      });

      activeTickets.forEach(ticket => {
        const priority = normalizePriority(ticket.priority);
        if (priority) counts[priority]++;
      });
      setData(Object.entries(counts).map(([priority, count]) => ({ priority, count })));
    } else {
      setData([]);
    }
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Priority of Active Tickets</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="priority" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#6a9cc6" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketPriorityChart;
