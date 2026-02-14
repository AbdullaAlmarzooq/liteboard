import React, { useState, useEffect } from "react";
import useFetch from "../useFetch";
import { UserCircle, Ticket, Users, ClipboardList, Lock } from "lucide-react";
import RecentActivity from "../components/Profile/RecentActivity.jsx";
import MyTickets from "../components/Profile/MyTickets";
import ChangePasswordModal from "../components/Profile/ChangePasswordModal";
import AssignedWorkflowBarChart from "../components/Profile/AssignedWorkflowBarChart";
import WorkgroupStatusPieChart from "../components/Profile/WorkgroupStatusPieChart";

const ProfileActivity = () => {
  const [stats, setStats] = useState({
    raised_by_me: 0,
    assigned_to_me: 0,
    workgroup_tickets: 0,
  });

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const token = localStorage.getItem("token");

  const {
    data: ticketsData,
    isPending: ticketsPending,
    error: ticketsError,
  } = useFetch("http://localhost:8000/api/tickets");

  // Fetch quick stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/profile/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching profile stats:", err);
      }
    };

    if (token) fetchStats();
  }, [token]);

  // Refresh user details (role/workgroup names) from API
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user?.id || !token) return;
      try {
        const response = await fetch(`http://localhost:8000/api/employees/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const merged = {
          ...user,
          role_name: data.roleName,
          workgroup_name: data.workgroupName,
          workgroup_id: data.workgroupId,
          role_id: data.roleId,
        };
        setUser(merged);
        localStorage.setItem("user", JSON.stringify(merged));
      } catch (err) {
        console.error("Error fetching user details:", err);
      }
    };

    fetchUserDetails();
  }, [token, user?.id]);

  if (!user) {
    return (
      <div className="p-10 text-center text-gray-600 dark:text-gray-300">
        No user found. Please log in again.
      </div>
    );
  }

  const myAssignedTickets = Array.isArray(ticketsData)
    ? ticketsData.filter((t) => {
        const isAssigned = t.responsible_employee_id === user.id;
        const isActiveByVariant =
          t.status_variant ? t.status_variant !== "new" && t.status_variant !== "destructive" : true;
        const isActiveByStatus = t.status !== "Closed" && t.status !== "Cancelled";
        return isAssigned && isActiveByVariant && isActiveByStatus;
      })
    : [];

  const myWorkgroupTickets = Array.isArray(ticketsData)
    ? ticketsData.filter((t) => {
        const isSameWorkgroup = t.workgroup_id === user.workgroup_id;
        const isActiveByVariant =
          t.status_variant ? t.status_variant !== "new" && t.status_variant !== "destructive" : true;
        const isActiveByStatus = t.status !== "Closed" && t.status !== "Cancelled";
        return isSameWorkgroup && isActiveByVariant && isActiveByStatus;
      })
    : [];

  return (
    <div className="p-8 space-y-8">
      {/* === User Header === */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <UserCircle className="w-16 h-16 text-blue-500" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {user.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {user.email}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Role: {user.role_name || user.role || "Unknown"} | Workgroup: {user.workgroup_name || "Unknown"}
              </p>
            </div>
          </div>
          
          {/* Change Password Button */}
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-400 hover:bg-gray-700 text-white rounded-lg transition-colors dark:bg-gray-600 dark:hover:bg-gray-500"
          >
            <Lock className="w-4 h-4" />
            Change Password
          </button>
        </div>
      </div>

      {/* === Quick Stats === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Tickets Created by Me"
          value={stats.raised_by_me}
          icon={<ClipboardList className="w-6 h-6 text-blue-500" />}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Tickets Assigned to Me"
          value={stats.assigned_to_me}
          icon={<Ticket className="w-6 h-6 text-yellow-500" />}
          color="text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          title="Workgroup Tickets"
          value={stats.workgroup_tickets}
          icon={<Users className="w-6 h-6 text-green-500" />}
          color="text-green-600 dark:text-green-400"
        />
      </div>

      {/* === Profile Charts === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ticketsPending ? (
          <div className="col-span-1 md:col-span-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading ticket charts...
          </div>
        ) : ticketsError ? (
          <div className="col-span-1 md:col-span-2 text-center text-sm text-red-600 dark:text-red-400">
            Failed to load ticket data for charts.
          </div>
        ) : (
          <>
            <AssignedWorkflowBarChart tickets={myAssignedTickets} />
            <WorkgroupStatusPieChart tickets={myWorkgroupTickets} />
          </>
        )}
      </div>

      {/* === Recent Activity + My Tickets === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MyTickets />
        <RecentActivity />
      </div>

      {/* === Change Password Modal === */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
};

/**
 * Reusable card component for stats
 */
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col justify-center items-center transition-colors duration-200">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {title}
      </h3>
      <p className={`text-4xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
};

export default ProfileActivity;
