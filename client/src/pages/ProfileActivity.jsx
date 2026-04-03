import React, { useEffect, useState } from "react";
import useFetch from "../useFetch";
import { UserCircle, Ticket, Users, ClipboardList, Lock } from "lucide-react";
import RecentActivity from "../components/Profile/RecentActivity.jsx";
import MyTickets from "../components/Profile/MyTickets";
import ChangePasswordModal from "../components/Profile/ChangePasswordModal";
import AssignedWorkflowBarChart from "../components/Profile/AssignedWorkflowBarChart";
import WorkgroupStatusPieChart from "../components/Profile/WorkgroupStatusPieChart";
import { ProfilePageSkeleton } from "../components/PageSkeletons";
import { Card, CardContent, CardHeader } from "../components/Card";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
);

const OverviewStatCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col justify-center items-center transition-colors duration-200">
    <SkeletonBlock className="mb-3 h-6 w-6 rounded-sm" />
    <SkeletonBlock className="h-4 w-32" />
    <SkeletonBlock className="mt-1 h-10 w-16" />
  </div>
);

const OverviewChartSkeleton = () => (
  <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
    <CardHeader className="space-y-2">
      <SkeletonBlock className="h-7 w-40" />
    </CardHeader>
    <CardContent>
      <div className="h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex h-full items-end justify-between gap-4">
          <SkeletonBlock className="h-24 w-10 rounded-t-md" />
          <SkeletonBlock className="h-36 w-10 rounded-t-md" />
          <SkeletonBlock className="h-28 w-10 rounded-t-md" />
          <SkeletonBlock className="h-44 w-10 rounded-t-md" />
          <SkeletonBlock className="h-20 w-10 rounded-t-md" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ProfileActivity = () => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const {
    data: overviewData,
    isPending: overviewPending,
    error: overviewError,
  } = useFetch("http://localhost:8000/api/profile/overview");

  useEffect(() => {
    const overviewUser = overviewData?.user;
    if (!overviewUser) return;

    setUser((currentUser) => {
      const mergedUser = {
        ...(currentUser || {}),
        ...overviewUser,
      };
      localStorage.setItem("user", JSON.stringify(mergedUser));
      return mergedUser;
    });
  }, [overviewData]);

  const displayUser = overviewData?.user || user;

  if (!displayUser && overviewPending) {
    return <ProfilePageSkeleton />;
  }

  if (!displayUser) {
    return (
      <div className="p-10 text-center text-gray-600 dark:text-gray-300">
        No user found. Please log in again.
      </div>
    );
  }

  const profileOverview = overviewData && typeof overviewData === "object" ? overviewData : {};
  const assignedWorkflowData = Array.isArray(profileOverview.assigned_workflows)
    ? profileOverview.assigned_workflows
    : [];
  const workgroupStatusData = Array.isArray(profileOverview.workgroup_statuses)
    ? profileOverview.workgroup_statuses
    : [];

  return (
    <div className="p-8 space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <UserCircle className="w-16 h-16 text-blue-500" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {displayUser.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {displayUser.email}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Role: {displayUser.role_name || displayUser.role || "Unknown"} | Workgroup: {displayUser.workgroup_name || "Unknown"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-400 hover:bg-gray-700 text-white rounded-lg transition-colors dark:bg-gray-600 dark:hover:bg-gray-500"
          >
            <Lock className="w-4 h-4" />
            Change Password
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {overviewPending && !overviewData ? (
          <>
            <OverviewStatCardSkeleton />
            <OverviewStatCardSkeleton />
            <OverviewStatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Tickets Created by Me"
              value={overviewError ? "--" : profileOverview.raised_by_me || 0}
              icon={<ClipboardList className="w-6 h-6 text-blue-500" />}
              color="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              title="Tickets Assigned to Me"
              value={overviewError ? "--" : profileOverview.assigned_to_me || 0}
              icon={<Ticket className="w-6 h-6 text-yellow-500" />}
              color="text-yellow-600 dark:text-yellow-400"
            />
            <StatCard
              title="Workgroup Tickets"
              value={overviewError ? "--" : profileOverview.workgroup_tickets || 0}
              icon={<Users className="w-6 h-6 text-green-500" />}
              color="text-green-600 dark:text-green-400"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {overviewPending && !overviewData ? (
          <>
            <OverviewChartSkeleton />
            <OverviewChartSkeleton />
          </>
        ) : overviewError ? (
          <div className="col-span-1 md:col-span-2 text-center text-sm text-red-600 dark:text-red-400">
            Failed to load profile summary data.
          </div>
        ) : (
          <>
            <AssignedWorkflowBarChart data={assignedWorkflowData} />
            <WorkgroupStatusPieChart data={workgroupStatusData} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MyTickets />
        <RecentActivity />
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

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
