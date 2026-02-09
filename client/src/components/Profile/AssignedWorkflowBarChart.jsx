import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const AssignedWorkflowBarChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      const counts = {};
      tickets.forEach((t) => {
        const name =
          t.workflow_name ||
          t.workflowName ||
          t.workflow_id ||
          "Unknown";
        counts[name] = (counts[name] || 0) + 1;
      });
      setData(Object.entries(counts).map(([workflow, count]) => ({ workflow, count })));
    } else {
      setData([]);
    }
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold mb-4">My Tickets by Workflow</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="workflow" angle={0} interval={0} height={70} tick={{ fontSize: 12, fill: '#6B7280' }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2c6799" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AssignedWorkflowBarChart;
