import { useSelector } from "react-redux"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import Auth from "./pages/AuthPage/Auth"
import ChatPage from "./pages/ChatPage"
import HomePage from "./pages/HomePage/HomePage"
import OtpPage from "./pages/OtpPage/OtpPage"
import ProfilePage from "./pages/ProfilePage/ProfilePage"
import { selectCurrentUser } from "./redux/user/userSlice"

const ProtectedRoute = () => {
  const currentUser = useSelector(selectCurrentUser)

  if (currentUser === undefined) {
    return <div>Loading...</div>
  }

  return currentUser ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path='/' element={
        <Navigate to='/home' replace={true} />
      }/>

      {/* auth */}
      <Route path='login' element={<Auth/>} />
      <Route path='signup' element={<Auth/>} />
      <Route path='/otp' element={<OtpPage/>} />
      <Route path="auth/forgot" element={<Auth/>} />
      <Route path="auth/forgot/otp" element={<Auth/>} />
      <Route path="auth/forgot/reset" element={<Auth/>} />
      {/* Protected Route */}
      <Route element={<ProtectedRoute/>} >
        {/* setting */}
        <Route path='settings/account' element={<ProfilePage/>} />
        <Route path='settings/security' element={<ProfilePage/>} />
        <Route path='chats' element={<ChatPage/>} />
        {/* main */}
        <Route path="home" element={<HomePage/>} />
      </Route>

    </Routes>
  )
}
