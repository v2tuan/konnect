import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { injectStore } from './utils/authorizeAxios'
import { store } from './redux/store'
import { persistStore } from 'redux-persist'
import { repairUsersMap } from '@/redux/user/userSlice'
import { connectSocket } from '@/lib/socket'
import { setUserStatus } from '@/redux/user/userSlice'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { ThemeProvider } from "@/components/theme-provider"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

injectStore(store)

const persistor = persistStore(store, null, () => {
  // After initial rehydrate
  store.dispatch(repairUsersMap())
  const state = store.getState()
  const me = state.user?.currentUser
  if (me) {
    const socket = connectSocket()
    // Gắn handler chỉ một lần cho phiên đã rehydrate
    if (!socket._presenceHandlersAttached) {
      socket._presenceHandlersAttached = true
      socket.on('presence:update', (payload) => {
        store.dispatch(setUserStatus(payload))
      })
      socket.on('presence:snapshot', (list) => {
        ;(list || []).forEach(item => store.dispatch(setUserStatus(item)))
      })
    }
    socket.once('connect', () => {
      // Đánh dấu chính mình online (phòng trường hợp chưa login effect)
      store.dispatch(setUserStatus({
        userId: me._id,
        isOnline: true,
        lastActiveAt: new Date().toISOString()
      }))
      const ids = Object.keys(store.getState().user?.usersById || {})
      if (ids.length) socket.emit('presence:snapshot', ids)
      // Heartbeat interval (tránh trùng bằng flag)
      if (!window.__presenceHeartbeatInterval) {
        window.__presenceHeartbeatInterval = setInterval(() => {
          if (socket.connected) socket.emit('presence:heartbeat')
        }, 30000)
      }
    })
  }
})

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename='/' >
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <StrictMode>
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
          </StrictMode>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </BrowserRouter>
)