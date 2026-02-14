import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const PendingTicketsPerTypeChart = ({ tickets = [] }) => {
  const data = useMemo(() => {
    const safeTickets = Array.isArray(tickets) ? tickets : [];

    const activeTickets = safeTickets.filter((t) => {
      if (t.status_variant) {
        return t.status_variant !== "new" && t.status_variant !== "destructive";
      }
      return t.status !== "Closed" && t.status !== "Cancelled";
    });

    const counts = {};
    activeTickets.forEach((ticket) => {
      const workflowName = ticket.workflow_name || ticket.workflowName || "Unknown";
      counts[workflowName] = (counts[workflowName] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Pending Tickets Per Type</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" interval={0} height={70} tick={{ fontSize: 12, fill: "#6B7280" }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2c6799" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PendingTicketsPerTypeChart;
