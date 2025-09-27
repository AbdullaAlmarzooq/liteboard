import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#9cc1e0", "#6a9cc6", "#457caa", "#2c6799", "#155081"];

const TicketModuleStackedChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      // Only count pending tickets
      const pendingTickets = tickets.filter(
        (t) => t.status !== "Closed" && t.status !== "Cancelled"
      );

      const counts = {};
      pendingTickets.forEach((ticket) => {
        const moduleName = ticket.module_name || "Unknown";
        counts[moduleName] = (counts[moduleName] || 0) + 1;
      });

      setData(Object.entries(counts).map(([name, value]) => ({ name, value })));
    } else {
      setData([]);
    }
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Pending Tickets by Module</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketModuleStackedChart;