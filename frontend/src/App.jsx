import LoginPage from "./pages/LoginPage/LoginPage";
import { Routes, Route, Navigate } from "react-router-dom"
export default function App() {
  return (
    <Routes>
      <Route path='/' element={
        <Navigate to='/login' replace={true} />
      }/>

      {/* auth */}
      <Route path='/login' element={<LoginPage/>} />

      <Route path='/settings/account' element={<LoginPage/>} />
      <Route path='/settings/security' element={<LoginPage/>} />
    
    </Routes>
  )
}
