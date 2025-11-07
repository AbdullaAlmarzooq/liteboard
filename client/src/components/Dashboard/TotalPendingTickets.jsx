import React, { useMemo } from "react";

const TotalPendingTickets = ({ tickets }) => {
  // Create a safe array reference: use the 'tickets' prop if it's an array, otherwise use an empty array.
  const safeTickets = Array.isArray(tickets) ? tickets : [];

  const totalPending = useMemo(() => {
    // We now use safeTickets, which is guaranteed to be an array.
    return safeTickets.filter(t => t.status !== 'Closed' && t.status !== 'Cancelled').length;
  }, [safeTickets]); // Depend on safeTickets

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Active Tickets</h3>
      <p className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">{totalPending}</p>
    </div>
  );
};

export default TotalPendingTickets;