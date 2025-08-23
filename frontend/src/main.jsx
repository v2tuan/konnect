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

injectStore(store)

const persistor = persistStore(store)

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename='/' >
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <StrictMode>
            <App />
          </StrictMode>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </BrowserRouter>
)
