import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";

const TicketsCreatedLineChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      const counts = {};
      tickets.forEach(ticket => {
        if (ticket.initiateDate) {
          const dateObj = new Date(ticket.initiateDate);
          const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
          counts[formattedDate] = (counts[formattedDate] || 0) + 1;
        }
      });
      setData(Object.keys(counts).map(date => ({ date, count: counts[date] })).sort((a,b)=>new Date(a.date)-new Date(b.date)));
    } else setData([]);
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Tickets Created Per Day</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top:5,right:30,left:20,bottom:5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#6a9cc6" activeDot={{r:8}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketsCreatedLineChart;