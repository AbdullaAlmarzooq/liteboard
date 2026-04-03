import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const ACTIVE_TICKET_CATEGORY_CODES = new Set([10, 20]);
const ACTIVE_TICKET_CATEGORY_NAMES = new Set(["open", "in progress"]);
const ACTIVE_TICKET_STATUS_VARIANTS = new Set(["default", "secondary"]);

const TicketModuleStackedChart = ({ tickets = [] }) => {
  const data = useMemo(() => {
    const safeTickets = Array.isArray(tickets) ? tickets : [];

    const activeTickets = safeTickets.filter((ticket) => {
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

    const counts = {};
    activeTickets.forEach((ticket) => {
      const moduleName = ticket.module_name || ticket.module || "Unknown";
      counts[moduleName] = (counts[moduleName] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Active Tickets by Module</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} height={70} tick={{ fontSize: 12, fill: "#6B7280" }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#2c6799" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketModuleStackedChart;
