import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const TicketStatusChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      const allStatuses = [...new Set(tickets.map(t => t.status?.trim()).filter(Boolean))];
      const counts = allStatuses.reduce((acc,status)=>{ acc[status]=0; return acc; }, {});
      tickets.forEach(t => {
        const status = t.status?.trim();
        if(status && counts.hasOwnProperty(status)) counts[status]++;
      });
      setData(Object.entries(counts).map(([status,count])=>({status,count})));
    } else setData([]);
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Tickets by Status</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" angle={0} interval={0} height={70} tick={{ fontSize:13, fill:'#6B7280'}} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2c6799" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketStatusChart;