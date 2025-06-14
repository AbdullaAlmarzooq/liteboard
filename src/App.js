"use client"
import { useState } from "react"
import Navigation from "./components/Navigation"
import Dashboard from "./pages/Dashboard"
import TicketsPage from "./pages/TicketsPage"
import CreateTicketPage from "./pages/CreateTicketPage"
import { ThemeProvider } from "./contexts/ThemeContext"

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard")

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "tickets":
        return <TicketsPage />
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
