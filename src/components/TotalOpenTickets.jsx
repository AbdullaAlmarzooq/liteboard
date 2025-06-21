import React, { useMemo } from 'react';

const TotalOpenTickets = ({ tickets }) => {
  const totalOpen = useMemo(() => {
    return tickets.filter(ticket => ticket.status === 'Open').length;
  }, [tickets]);

  return (
    <div className="rounded-xl shadow-lg p-6 bg-white dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Open Tickets</h3>
      <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">{totalOpen}</p>
    </div>
  );
};

export default TotalOpenTickets;