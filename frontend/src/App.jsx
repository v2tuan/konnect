import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignUpPage from "./pages/SignUpPage/SignUpPage";
import OtpPage from "./pages/OtpPage/OtpPage";
import { Routes, Route, Navigate } from "react-router-dom"
export default function App() {
  return (
    <Routes>
      <Route path='/' element={
        <Navigate to='/login' replace={true} />
      }/>

      {/* auth */}
      <Route path='/login' element={<LoginPage/>} />
      <Route path='/signup' element={<SignUpPage/>} />
      <Route path='/otp' element={<OtpPage/>} />

      {/* main */}

      <Route path="/home" element={<HomePage/>} />

      <Route path='/settings/account' element={<LoginPage/>} />
      <Route path='/settings/security' element={<LoginPage/>} />
    
    </Routes>
  )
}
