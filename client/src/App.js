"use client"
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import Navigation from "./components/Navigation"
import Admin from "./pages/AdminPanel"
import Dashboard from "./pages/Dashboard"
import TicketsPage from "./pages/TicketsPage"
import CreateTicketPage from "./pages/CreateTicketPage"
import ViewTicket from "./components/ViewTicket"
import EditTicket from "./components/TicketManagement/EditTicket"
import { ThemeProvider } from "./contexts/ThemeContext"
import ProtectedRoute from "./components/Auth/ProtectedRoute"
import LoginPage from "./pages/LoginPage"

function AppLayout() {
  const location = useLocation()
  const hideNav = location.pathname === "/login"

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {!hideNav && <Navigation />}
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <TicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-ticket"
            element={
              <ProtectedRoute>
                <CreateTicketPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole={1}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/view-ticket/:ticketId"
            element={
              <ProtectedRoute>
                <ViewTicket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-ticket/:ticketId"
            element={
              <ProtectedRoute>
                <EditTicket />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout />
      </Router>
    </ThemeProvider>
  )
}