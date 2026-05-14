import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#9cc1e0", "#6a9cc6", "#457caa", "#2c6799", "#155081"];
const ACTIVE_TICKET_CATEGORY_CODES = new Set([10, 20]);
const ACTIVE_TICKET_CATEGORY_NAMES = new Set(["open", "in progress"]);
const ACTIVE_TICKET_STATUS_VARIANTS = new Set(["default", "secondary"]);

const PendingTicketsPieChart = ({ tickets = [], workgroups = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0 && workgroups.length > 0) {
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
  
      // Count tickets per workgroup
      const counts = {};
      activeTickets.forEach((ticket) => {
        const groupName =
          workgroups.find((w) => w.id === (ticket.workgroupId || ticket.workgroup_id))?.name ||
          ticket.workgroup_name ||
          ticket.workgroupName ||
          "Unknown";
        counts[groupName] = (counts[groupName] || 0) + 1;
      });
  
      setData(Object.entries(counts).map(([name, value]) => ({ name, value })));
    } else {
      setData([]);
    }
  }, [tickets, workgroups]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
        <h2 className="text-xl font-bold mb-4 text-center">Active Tickets by WorkGroup</h2>
        <ResponsiveContainer width="150%" height={300}>
          <PieChart>
            <Pie dataKey="value" nameKey="name" data={data} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PendingTicketsPieChart;
