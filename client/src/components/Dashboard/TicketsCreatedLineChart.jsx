import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";

const TicketsCreatedLineChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      console.log('[TicketsCreatedLineChart] sample ticket dates:', tickets.slice(0, 5).map(t => ({
        id: t.id,
        ticketCode: t.ticket_code || t.ticketCode,
        initiateDate: t.initiateDate,
        initiate_date: t.initiate_date,
        created_at: t.created_at,
        createdAt: t.createdAt
      })));
      const counts = {};
      tickets.forEach(ticket => {
        const rawDate =
          ticket.initiateDate ||
          ticket.initiate_date ||
          ticket.created_at ||
          ticket.createdAt;
        if (rawDate) {
          const dateObj = new Date(rawDate);
          if (Number.isNaN(dateObj.getTime())) return;
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
