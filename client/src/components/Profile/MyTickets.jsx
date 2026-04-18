import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../Card";
import { Link } from "react-router-dom";
import Pagination from "../Profile/Pagination.jsx";
import { ProfileSectionCardSkeleton } from "../PageSkeletons";

const formatTicketTitle = (title, maxLength = 30) => {
  const safeTitle = typeof title === "string" ? title : "";
  if (safeTitle.length <= maxLength) return safeTitle;
  if (maxLength <= 3) return safeTitle.slice(0, maxLength);
  return `${safeTitle.slice(0, maxLength - 3)}...`;
};

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchTickets = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(itemsPerPage),
        });
        const res = await fetch(`http://localhost:8000/api/profile/my-tickets?${params.toString()}`, {
          signal: abortController.signal,
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load tickets");
        const data = await res.json();
        setTickets(Array.isArray(data.items) ? data.items : []);
        setTotalItems(Number(data.total) || 0);
        setError("");
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching workgroup tickets:", err);
        setError("Failed to load tickets");
        setTickets([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();

    return () => abortController.abort();
  }, [currentPage, itemsPerPage]);

  if (loading) {
    return <ProfileSectionCardSkeleton titleWidth="w-52" columns={6} rows={4} />;
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 text-center p-6">
        <CardTitle className="text-red-500">{error}</CardTitle>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-left">Pending Workgroup Tickets</CardTitle>
      </CardHeader>
      <CardContent className="text-left">
        {tickets.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-left py-4">
            No tickets found for your workgroup.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left">Ticket ID</th>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Priority</th>
                  <th className="px-4 py-2 text-left">Responsible</th>
                  <th className="px-4 py-2 text-left">Created By</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const displayId = ticket.ticketCode || ticket.ticket_code || ticket.id;
                  return (
                    <tr
                      key={ticket.id}
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        <Link to={`/view-ticket/${displayId}`}>{displayId}</Link>
                      </td>
                      <td className="px-4 py-2" title={ticket.title || "-"}>
                        {formatTicketTitle(ticket.title || "-", 30)}
                      </td>
                      <td className="px-4 py-2">{ticket.status}</td>
                      <td className="px-4 py-2">{ticket.priority}</td>
                      <td className="px-4 py-2">
                        {ticket.responsible_name || "Unassigned"}
                      </td>
                      <td className="px-4 py-2">
                        {ticket.created_by_name || ticket.created_by || "N/A"}
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

export default MyTickets;
