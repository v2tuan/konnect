import { Navigate, Route, Routes } from "react-router-dom"
import Auth from "./pages/AuthPage/Auth"
import LoginPage from "./pages/AuthPage/LoginPage"
import HomePage from "./pages/HomePage/HomePage"
import OtpPage from "./pages/OtpPage/OtpPage"
import ProfilePage from "./pages/ProfilePage/ProfilePage"
import ForgotPasswordPage from "@/pages/AuthPage/ForgotPasswordPage.jsx";
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
      {/* setting */}
      <Route path='settings/account' element={<ProfilePage/>} />
      <Route path='settings/security' element={<ProfilePage/>} />

      {/* main */}
      <Route path="/home" element={<HomePage/>} />

      <Route path='/settings/account' element={<LoginPage/>} />
      <Route path='/settings/security' element={<LoginPage/>} />

    </Routes>
  )
}
