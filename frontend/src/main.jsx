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

injectStore(store)

const persistor = persistStore(store)

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