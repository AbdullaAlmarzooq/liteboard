import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#9cc1e0", "#6a9cc6", "#457caa", "#2c6799", "#155081"];


const OpenTicketsPieChart = ({ tickets }) => { 
  const [data, setData] = useState([]);

  useEffect(() => {

    if (tickets.length > 0) {
      const openTickets = tickets.filter(t => t.status === "Open"); 

      const counts = {};
      openTickets.forEach(ticket => { 
        const group = ticket.workGroup?.trim() || "Unknown"; 
        counts[group] = (counts[group] || 0) + 1; 
      });

      const chartData = Object.entries(counts).map(([name, value]) => ({ 
        name,
        value,
      }));

      setData(chartData); 
    } else {
        setData([]); 
    }
  }, [tickets]);

  return (
    <div className="flex justify-center items-center min-h-[400px]">
        <div className="rounded-xl shadow p-6 w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4 text-center">Open Tickets by Work Group</h2>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        dataKey="value"
                        nameKey="name"
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label
                    >
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

export default OpenTicketsPieChart;