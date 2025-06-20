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

      tickets.forEach(ticket => { 
        const module = ticket.module?.trim() || "Unknown"; 
        const status = ticket.status?.trim(); 

        if (status === "Open" || status === "In Progress") { 
          if (!counts[module]) { 
            counts[module] = { module, Open: 0, InProgress: 0 }; 
          }
          if (status === "Open") { 
            counts[module].Open++; 
          }
          if (status === "In Progress") { 
            counts[module].InProgress++; 
          }
        }
      });

      const chartData = Object.values(counts); 
      setData(chartData); 
    } else {
        setData([]);
    }
  }, [tickets]); 

  return (
    <div className="rounded-xl shadow p-6 w-full">
      <h2 className="text-xl font-bold mb-4">Open and In Progress Tickets by Module</h2>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="module" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Open" stackId="a" fill="#9cc1e0" />
          <Bar dataKey="InProgress" stackId="a" fill="#457caa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketModuleStackedChart;