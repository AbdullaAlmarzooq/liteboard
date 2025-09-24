import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";


const TicketStatusChart = ({ tickets }) => { 
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      // Dynamically get all unique statuses from the tickets data
      const allStatuses = [...new Set(tickets.map(ticket => ticket.status?.trim()))].filter(Boolean);
      
      const counts = allStatuses.reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {});

      tickets.forEach(ticket => { 
        const status = ticket.status?.trim(); 
        if (counts.hasOwnProperty(status)) { 
          counts[status]++;
        } else {
          console.warn("Unknown status found:", status);
        }
      });

      const chartData = Object.entries(counts).map(([status, count]) => ({ 
        status,
        count,
      }));

      setData(chartData); 
    } else {
        setData([]);
    }
  }, [tickets]); 

  return (
    <div className="bg-white rounded-xl shadow-sm p-6  dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Tickets by Status</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="status" 
            angle={0} 
            interval={0} 
            height={70} 
            tick={{ fontSize: 13, fill: '#6B7280' }}
          />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2c6799" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketStatusChart;