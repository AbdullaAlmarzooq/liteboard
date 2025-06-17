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

const InProgressTicketsPieChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/tickets")
      .then(res => res.json())
      .then(tickets => {
        
        const inProgressTickets = tickets.filter(t => t.status === "In Progress");

        
        const counts = {};
        inProgressTickets.forEach(ticket => {
          const group = ticket.workGroup?.trim() || "Unknown";
          counts[group] = (counts[group] || 0) + 1;
        });

        
        const chartData = Object.entries(counts).map(([name, value]) => ({
          name,
          value,
        }));

        setData(chartData);
      });
  }, []);

return (
    <div className="flex justify-center items-center min-h-[400px]">
        <div className="rounded-xl shadow p-6 w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4 text-center">In Progress Tickets by Work Group</h2>
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

export default InProgressTicketsPieChart;
