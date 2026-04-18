import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../Card";
import Pagination from "../Profile/Pagination.jsx";
import { ProfileSectionCardSkeleton } from "../PageSkeletons";
import { buildActivitySummary } from "./activitySummary";

const formatActivityTimestamp = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const RecentActivity = () => {
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(itemsPerPage),
        });
        const res = await fetch(`http://localhost:8000/api/profile/activity?${params.toString()}`, {
          signal: abortController.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load activity data");
        const data = await res.json();
        setActivity(Array.isArray(data.items) ? data.items : []);
        setTotalItems(Number(data.total) || 0);
        setError(null);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching activity:", err);
        setError(err.message);
        setActivity([]);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();

    return () => abortController.abort();
  }, [currentPage, itemsPerPage]);

  if (isLoading) {
    return <ProfileSectionCardSkeleton titleWidth="w-40" columns={6} rows={4} />;
  }
  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">My Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">
            Unable to load activity right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayActivity = Array.isArray(activity) ? activity : [];

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">My Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {displayActivity.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left">Ticket ID</th>
                  <th className="px-4 py-2 text-left">Activity</th>
                  <th className="px-4 py-2 text-left">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {displayActivity.map((rawActivity, rowIndex) => {
                  const act =
                    rawActivity && typeof rawActivity === "object" ? rawActivity : {};
                  const rowId = act.id || `activity-row-${rowIndex}`;
                  const ticketRef = act.ticket_code || act.ticket_id || null;

                  return (
                    <tr
                      key={rowId}
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <td className="px-4 py-2 font-medium">
                        {ticketRef ? (
                          <a
                            href={`/view-ticket/${ticketRef}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          >
                            {ticketRef}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                        <p>{buildActivitySummary(act)}</p>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {formatActivityTimestamp(act.occurred_at || act.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
