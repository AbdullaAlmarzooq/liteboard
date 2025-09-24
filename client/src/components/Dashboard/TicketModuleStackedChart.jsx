import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const TicketModuleStackedChart = ({ tickets }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      const counts = {};

      tickets.forEach((ticket) => {
        const module = ticket.module?.trim() || "Unknown";
        const status = ticket.status?.trim();

        // ✅ Count all tickets that are NOT Closed or Cancelled
        if (status !== "Closed" && status !== "Cancelled") {
          if (!counts[module]) {
            counts[module] = { module, Pending: 0 };
          }
          counts[module].Pending++;
        }
      });

      const chartData = Object.values(counts);
      setData(chartData);
    } else {
      setData([]);
    }
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Pending Tickets by Module</h2>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
          dataKey="module"
          tick={{ fontSize: 13, fill: '#6B7280' }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Pending" stackId="a" fill="#6a9cc6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketModuleStackedChart;
