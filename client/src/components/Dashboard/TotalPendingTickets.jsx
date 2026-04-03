import React, { useMemo } from "react";

const ACTIVE_TICKET_CATEGORY_CODES = new Set([10, 20]);
const ACTIVE_TICKET_CATEGORY_NAMES = new Set(["open", "in progress"]);
const ACTIVE_TICKET_STATUS_VARIANTS = new Set(["default", "secondary"]);

const TotalPendingTickets = ({ tickets }) => {
  const totalPending = useMemo(() => {
    const safeTickets = Array.isArray(tickets) ? tickets : [];

    return safeTickets.filter((ticket) => {
      const categoryCode = Number(
        ticket.step_category_code ?? ticket.stepCategoryCode ?? ticket.category_code ?? ticket.categoryCode
      );

      if (ACTIVE_TICKET_CATEGORY_CODES.has(categoryCode)) {
        return true;
      }

      const statusVariant = String(ticket.status_variant ?? ticket.statusVariant ?? "")
        .trim()
        .toLowerCase();

      if (ACTIVE_TICKET_STATUS_VARIANTS.has(statusVariant)) {
        return true;
      }

      // Fallback for any older payloads that still expose category names instead of codes.
      const categoryName = String(ticket.category ?? ticket.categoryName ?? ticket.status ?? "")
        .trim()
        .toLowerCase();

      return ACTIVE_TICKET_CATEGORY_NAMES.has(categoryName);
    }).length;
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800 transition-colors duration-200 text-center flex flex-col justify-center items-center">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Active Tickets</h3>
      <p className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">{totalPending}</p>
    </div>
  );
};

export default TotalPendingTickets;
