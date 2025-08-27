import { Navigate, Outlet } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"
import { API_ROOT } from "@/utils/constant"

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null: loading, true: authenticated, false: not authenticated

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API_ROOT}/api/auth/check`, { withCredentials: true })
        if (response.status === 200 && response.data.authenticated) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      // eslint-disable-next-line no-unused-vars
      } catch (error) {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  if (isAuthenticated === null) {
    return <div>Loading...</div> // Hoặc một spinner/loading indicator
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}