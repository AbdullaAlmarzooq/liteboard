import React from "react"
import { Navigate } from "react-router-dom"

const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // If route has a role restriction, check it
  if (requiredRole && user.role_id !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
