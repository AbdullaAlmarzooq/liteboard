import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../Card";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import Pagination from "../Profile/Pagination.jsx";

const MyTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/profile/my-tickets", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load tickets");
        const data = await res.json();
        setTickets(data);
      } catch (err) {
        console.error("Error fetching workgroup tickets:", err);
        setError("Failed to load tickets");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const totalItems = tickets.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = tickets.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 text-center p-6">
        <CardTitle>Loading My Workgroup Tickets...</CardTitle>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 text-center p-6">
        <CardTitle className="text-red-500">{error}</CardTitle>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-xl">My Workgroup Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No tickets found for your workgroup.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700">
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
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400">
                      <Link to={`/view-ticket/${ticket.id}`}>{ticket.id}</Link>
                    </td>
                    <td className="px-4 py-2">{ticket.title}</td>
                    <td className="px-4 py-2">{ticket.status}</td>
                    <td className="px-4 py-2">{ticket.priority}</td>
                    <td className="px-4 py-2">
                      {ticket.responsible_name || "Unassigned"}
                    </td>
                    <td className="px-4 py-2">
                      {ticket.created_by_name || ticket.created_by || "N/A"}
                    </td>
                  </tr>
                ))}
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
