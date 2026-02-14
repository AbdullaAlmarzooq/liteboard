import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#9cc1e0", "#6a9cc6", "#457caa", "#2c6799", "#155081", "#0f3d64"];

const WorkgroupStatusPieChart = ({ tickets = [] }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (tickets.length > 0) {
      const counts = {};
      tickets.forEach((t) => {
        const stepName =
          t.current_step_name?.trim() ||
          t.currentStepName?.trim() ||
          t.status?.trim() ||
          "Unknown";
        counts[stepName] = (counts[stepName] || 0) + 1;
      });
      setData(Object.entries(counts).map(([name, value]) => ({ name, value })));
    } else {
      setData([]);
    }
  }, [tickets]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
        <h2 className="text-xl font-bold mb-4 text-center">Workgroup Tickets by Status</h2>
        <ResponsiveContainer width="150%" height={300}>
          <PieChart>
            <Pie dataKey="value" nameKey="name" data={data} cx="50%" cy="50%" outerRadius={100} label>
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

export default WorkgroupStatusPieChart;
