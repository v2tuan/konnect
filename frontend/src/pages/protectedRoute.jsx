import { Navigate, Outlet } from "react-router-dom"
import { useState, useEffect } from "react"

import { checkAuth } from "@/apis"

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null: loading, true: authenticated, false: not authenticated

  useEffect(() => {
    const verifyAuth = async () => {
      const authStatus = await checkAuth()
      setIsAuthenticated(authStatus)
    }

    verifyAuth()
  }, [])

  if (isAuthenticated === null) {
    return <div>Loading...</div> // Hoặc một spinner/loading indicator
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}