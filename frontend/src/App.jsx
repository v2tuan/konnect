import { useSelector } from "react-redux"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import Auth from "./pages/AuthPage/Auth"
import OtpPage from "./pages/OtpPage/OtpPage"
import ProfilePage from "./pages/ProfilePage/ProfilePage"
import { selectCurrentUser } from "./redux/user/userSlice"

import MainLayout from "./pages/HomePage/HomePage"
import MessagePage from "./pages/MessagePage/MessagePage"
import ContactPage from "./pages/ContactPage/ContactPage"
import CloudPage from "./pages/CloudPage/CloudPage"

// ✅ Toast
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const ProtectedRoute = () => {
  const currentUser = useSelector(selectCurrentUser)
  // có thể tuỳ biến state "đang check auth"
  if (currentUser === undefined) return <div>Loading...</div>
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/chats" replace />} />

        {/* Public auth routes */}
        <Route path="login" element={<Auth />} />
        <Route path="signup" element={<Auth />} />
        <Route path="otp" element={<OtpPage />} />
        <Route path="auth/forgot" element={<Auth />} />
        <Route path="auth/forgot/otp" element={<Auth />} />
        <Route path="auth/forgot/reset" element={<Auth />} />

        {/* Protected area */}
        <Route element={<ProtectedRoute />}>
          <Route path="settings/account" element={<ProfilePage />} />
          <Route path="settings/security" element={<ProfilePage />} />

          {/* App shell + nested pages */}
          <Route element={<MainLayout />}>
            <Route path="chats" element={<MessagePage />} />
            <Route path="chats/:conversationId" element={<MessagePage />} />
            <Route path="contacts/*" element={<ContactPage />} />
            <Route path="cloud" element={<CloudPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<div className="p-6">404 Not Found</div>} />
      </Routes>

      {/* ✅ Toast container global: luôn mount trong app */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </>
  )
}
