"use client"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import AppLayout from "./components/Layout/AppLayout"
import Admin from "./features/admin/pages/AdminPanel"
import Dashboard from "./features/dashboard/pages/Dashboard"
import TicketsPage from "./features/tickets/pages/TicketsPage"
import CreateTicketPage from "./features/tickets/pages/CreateTicketPage"
import ViewTicket from "./features/tickets/components/ViewTicket"
import EditTicket from "./features/tickets/components/EditTicket"
import { ThemeProvider } from "./contexts/ThemeContext"
import ProtectedRoute from "./components/Auth/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import { ToastContainer } from "react-toastify";
import ProfileActivity from "./features/profile/pages/ProfileActivity"
import ProjectsPage from "./features/projects/pages/ProjectsPage"
import AuditLogsPage from "./features/admin/pages/AuditLogsPage"


function AppRoutes() {
  return (
    <AppLayout>
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
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-ticket"
          element={
            <ProtectedRoute requiredRole={[1, 2]}>
              <CreateTicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileActivity />
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
          path="/admin/logs"
          element={
            <ProtectedRoute requiredRole={1}>
              <AuditLogsPage />
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
      <ToastContainer position="top-center" autoClose={4000} />
    </AppLayout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  )
}
