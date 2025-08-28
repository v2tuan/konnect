import { selectCurrentUser } from "@/redux/user/userSlice"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Navigate, Outlet } from "react-router-dom"

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null: loading, true: authenticated, false: not authenticated

  const currentUser = useSelector(selectCurrentUser)

  useEffect(() => {
    if (currentUser)
      setIsAuthenticated(true)
    else
      setIsAuthenticated(false)
  }, [currentUser])

  if (isAuthenticated === null) {
    return <div>Loading...</div> // Hoặc một spinner/loading indicator
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}