import { useLocation, Navigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/user/userSlice"
import LoginPage from "./LoginPage"
import SignUpPage from "./SignUpPage"
import ForgotEmailPage from "@/pages/AuthPage/ForgotPasswordPage/ForgotEmailPage.jsx";
import ForgotOtpPage from "@/pages/AuthPage/ForgotPasswordPage/ForgotOtpPage.jsx";
import ForgotResetPage from "@/pages/AuthPage/ForgotPasswordPage/ForgotResetPage.jsx";


function Auth() {
    const location = useLocation()
    const isLogin = location.pathname === "/login"
    const isSignup = location.pathname === "/signup"
    const isForgotEmail = location.pathname === "/auth/forgot"
    const isForgotOtp = location.pathname === "/auth/forgot/otp"
    const isForgotReset = location.pathname === "/auth/forgot/reset"

    const currentUser = useSelector(selectCurrentUser)
    if (currentUser) return <Navigate to="/" replace />

    return (
        <>
            {isLogin && <LoginPage/>}
            {isSignup && <SignUpPage/>}
            {isForgotEmail && <ForgotEmailPage/>}
            {isForgotOtp && <ForgotOtpPage/>}
            {isForgotReset && <ForgotResetPage/>}
        </>
    )
}

export default Auth
