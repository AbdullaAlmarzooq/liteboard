import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const TicketPriorityChart = () => {
  const [data, setData] = useState([]);

useEffect(() => {
  fetch("http://localhost:8000/tickets")
    .then(res => res.json())
    .then(tickets => {
      console.log("Fetched Tickets:", tickets); 

      const counts = { High: 0, Medium: 0, Low: 0 };

      tickets.forEach(ticket => {
        const priority = ticket.priority?.trim();
        if (counts.hasOwnProperty(priority)) {
          counts[priority]++;
        } else {
          console.warn("Unknown priority found:", priority);
        }
      });

      const chartData = Object.entries(counts).map(([priority, count]) => ({
        priority,
        count,
      }));

      console.log("Chart Data:", chartData); 

      setData(chartData);
    })
    .catch(err => {
      console.error("Failed to fetch tickets:", err);
    });
}, []);


  return (
    <div className="rounded-xl shadow p-6 w-full">
      <h2 className="text-xl font-bold mb-4">Tickets by Priority</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="priority" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#6a9cc6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketPriorityChart;
