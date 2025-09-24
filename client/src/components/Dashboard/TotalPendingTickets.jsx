import React, { useMemo } from 'react';

const TotalPendingTickets = ({ tickets }) => {
  const totalPending = useMemo(() => {
    return tickets.filter(ticket => 
      ticket.status !== 'Closed' &&
      ticket.status !== 'Cancelled'
    ).length;
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 bg-gray-200 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Active Tickets</h3>
      <p className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">{totalPending}</p>
    </div>
  );
};

export default TotalPendingTickets;