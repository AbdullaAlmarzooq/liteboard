import React from "react"
import { Navigate } from "react-router-dom"

const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // If route has specific role requirements
  if (requiredRole) {
    const userRole = user.role_id

    // Support both single role (e.g. 1) and multiple roles ([1, 2])
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

export default ProtectedRoute
