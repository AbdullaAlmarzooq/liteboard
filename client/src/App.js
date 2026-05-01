"use client"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import AppLayout from "./components/Layout/AppLayout"
import Admin from "./pages/AdminPanel"
import Dashboard from "./pages/Dashboard"
import TicketsPage from "./pages/TicketsPage"
import CreateTicketPage from "./pages/CreateTicketPage"
import ViewTicket from "./components/ViewTicket"
import EditTicket from "./components/TicketManagement/EditTicket"
import { ThemeProvider } from "./contexts/ThemeContext"
import ProtectedRoute from "./components/Auth/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import { ToastContainer } from "react-toastify";
import ProfileActivity from "./pages/ProfileActivity"
import ProjectsPage from "./pages/ProjectsPage"
import AuditLogsPage from "./pages/AuditLogsPage"


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
