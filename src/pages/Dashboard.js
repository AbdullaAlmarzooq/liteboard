import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Badge from "../components/Badge"
import TicketPriorityChart from "../components/TicketPriorityChart";
import TicketStatusChart from "../components/TicketStatusChart";
import OpenTicketsPieChart from "../components/OpenTicketsPieChart";
import InProgressTicketsPieChart from "../components/InProgressTicketsPieChart";
import TicketModuleStackedChart from "../components/TicketModuleStackedChart";




const Dashboard = () => {


  return (
  <div className="p-8 space-y-8">
    {/* Pie Charts Row */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <OpenTicketsPieChart />
      <InProgressTicketsPieChart />
    </div>

    {/* Bar Charts Row */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TicketPriorityChart />
      <TicketStatusChart />
    </div>
      <TicketModuleStackedChart />
    </div>
  )
}

export default Dashboard;
