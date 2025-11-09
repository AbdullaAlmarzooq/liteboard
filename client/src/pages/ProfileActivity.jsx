import React, { useState, useEffect } from "react";
import useFetch from "../useFetch";
import { UserCircle, Ticket, Users, ClipboardList } from "lucide-react";
import RecentActivity from "../components/Profile/RecentActivity.jsx";
import MyTickets from "../components/Profile/MyTickets";


/**
 * Profile & Activity Page
 * Sections:
 * 1. User Info Header
 * 2. Quick Stats Cards (Raised by Me, Assigned to Me, Workgroup)
 * 3. (Placeholder) Recent Activity / My Tickets section
 */
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

  const token = localStorage.getItem("token");

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

  if (!user) {
    return (
      <div className="p-10 text-center text-gray-600 dark:text-gray-300">
        No user found. Please log in again.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* === User Header === */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center gap-6 transition-colors duration-200">
        <UserCircle className="w-16 h-16 text-blue-500" />
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {user.name}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {user.email}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Role ID: {user.role_id} | Employee ID: {user.id}
          </p>
        </div>
      </div>

      {/* === Quick Stats === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Tickets Raised by Me"
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

        {/* === Recent Activity + My Tickets === */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <MyTickets />
          <RecentActivity />
        </div>

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
