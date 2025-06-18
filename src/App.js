"use client"
import { useState } from "react"
import Navigation from "./components/Navigation"
import Dashboard from "./pages/Dashboard"
import TicketsPage from "./pages/TicketsPage"
import CreateTicketPage from "./pages/CreateTicketPage"
import ViewTicket from "./components/ViewTicket"
import EditTicket from "./components/EditTicket"
import { ThemeProvider } from "./contexts/ThemeContext"

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard")

  const getTicketIdFromPage = (page) => {
    if (page.startsWith("view-ticket-")) {
      return page.replace("view-ticket-", "")
    }
    if (page.startsWith("edit-ticket-")) {
      return page.replace("edit-ticket-", "")
    }
    return null
  }

  const renderPage = () => {
    if (currentPage.startsWith("view-ticket-")) {
      const ticketId = getTicketIdFromPage(currentPage)
      return <ViewTicket ticketId={ticketId} setCurrentPage={setCurrentPage} />
    }

    if (currentPage.startsWith("edit-ticket-")) {
      const ticketId = getTicketIdFromPage(currentPage)
      return <EditTicket ticketId={ticketId} setCurrentPage={setCurrentPage} />
    }

    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "tickets":
        return <TicketsPage setCurrentPage={setCurrentPage} />
      case "create-ticket":
        return <CreateTicketPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
        <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {renderPage()}
        </main>
      </div>
    </ThemeProvider>
  )
}


export default App
