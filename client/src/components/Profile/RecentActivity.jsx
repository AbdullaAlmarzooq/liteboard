import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../Card";
import Pagination from "../Profile/Pagination.jsx";
import { useAuth } from "../hooks/useAuth";

const RecentActivity = () => {
  const { user } = useAuth();
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);


  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/profile/activity", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load activity data");
        const data = await res.json();
        setActivity(data);
      } catch (err) {
        console.error("Error fetching activity:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivity();
  }, []);

  // Pagination logic
  const totalItems = activity.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activity.slice(indexOfFirstItem, indexOfLastItem);

  if (isLoading) return <div>Loading activity...</div>;
  if (error) return <div className="text-red-600">Failed to load activity data</div>;

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">My Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {currentItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left">Ticket ID</th>
                  <th className="px-4 py-2 text-left">Activity</th>
                  <th className="px-4 py-2 text-left">Field</th>
                  <th className="px-4 py-2 text-left">New Value</th>
                  <th className="px-4 py-2 text-left">Changed By</th>
                  <th className="px-4 py-2 text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((act) => (
                  <tr
                    key={act.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <td className="px-4 py-2 font-medium">
                      {act.ticket_id ? (
                        <a
                          href={`/view-ticket/${act.ticket_id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          {act.ticket_id}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 capitalize">{act.activity_type}</td>
                    <td className="px-4 py-2">{act.field_name || "—"}</td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                      {act.new_value || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {act.changed_by_name || act.changed_by || "N/A"}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(act.timestamp).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ Add Pagination */}
        {totalItems > itemsPerPage && (
          <Pagination
            totalItems={totalItems}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
