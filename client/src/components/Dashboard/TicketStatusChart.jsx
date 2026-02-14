import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const TicketStatusChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      const getTicketStepName = (ticket) =>
        ticket.current_step_name?.trim() || ticket.currentStepName?.trim() || ticket.status?.trim();
      const activeTickets = tickets.filter(
        (t) => t.status_variant !== "new" && t.status_variant !== "destructive"
      );
      const allStatuses = [...new Set(activeTickets.map(getTicketStepName).filter(Boolean))];
      const counts = allStatuses.reduce((acc,status)=>{ acc[status]=0; return acc; }, {});
      activeTickets.forEach(t => {
        const status = getTicketStepName(t);
        if(status && counts.hasOwnProperty(status)) counts[status]++;
      });
      setData(Object.entries(counts).map(([status,count])=>({status,count})));
    } else setData([]);
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">Pending Tickets by Status</h2>
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
