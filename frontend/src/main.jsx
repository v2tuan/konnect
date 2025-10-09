import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { injectStore } from './utils/authorizeAxios'
import { store } from './redux/store'
import { persistStore } from 'redux-persist'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { ThemeProvider } from "@/components/theme-provider"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { createContext, useContext } from 'react'
import { useCallInvite } from '@/hooks/useCallInvite'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/redux/user/userSlice'

injectStore(store)

const persistor = persistStore(store)

const CallInviteContext = createContext(null)

export function CallInviteProvider({ children }) {
  const currentUser = useSelector(selectCurrentUser)
  const userId = currentUser?._id
  // Hook tự no-op khi chưa có userId
  const value = useCallInvite(userId)

  return (
    <CallInviteContext.Provider value={value}>
      {children}
    </CallInviteContext.Provider>
  )
}

export function useCallInviteContext() {
  return useContext(CallInviteContext)
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename='/' >
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <StrictMode>
            <CallInviteProvider>
              <App />
              <ToastContainer
                position="bottom-left"
                autoClose={3500}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
              />
            </CallInviteProvider>
          </StrictMode>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </BrowserRouter>
)