import { selectCurrentUser } from '@/redux/user/userSlice'
import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import LoginPage from './LoginPage'
import SignUpPage from './SignUpPage'

function Auth() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const isSignup = location.pathname === '/signup'

  const currentUser = useSelector(selectCurrentUser)
  if (currentUser) {
    return <Navigate to='/' replace={true} />
  }

  return (
    <>
      {isLogin && <LoginPage/>}
      {isSignup && <SignUpPage/>}
    </>
  )
}

export default Auth