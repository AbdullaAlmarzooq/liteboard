"use client"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Navigation from "./components/Navigation"
import Admin from "./pages/AdminPanel"
import Dashboard from "./pages/Dashboard"
import TicketsPage from "./pages/TicketsPage"
import CreateTicketPage from "./pages/CreateTicketPage"
import ViewTicket from "./components/ViewTicket"
import EditTicket from "./components/EditTicket"
import { ThemeProvider } from "./contexts/ThemeContext"

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/create-ticket" element={<CreateTicketPage />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/view-ticket/:ticketId" element={<ViewTicket />} />
              <Route path="/edit-ticket/:ticketId" element={<EditTicket />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
