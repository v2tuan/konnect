import axios from 'axios'
import { toast } from 'react-toastify'
import { interceptorLoadingElements } from './formatters'
import { clearCurrentUser } from '@/redux/user/userSlice'

let axiosReduxStore = null
export const injectStore = (mainStore) => {
  axiosReduxStore = mainStore
}

// Flag để tránh dispatch clear nhiều lần khi nhiều request cùng trả 401
let hasClearedAuth = false
export const resetClearedAuthFlag = () => { hasClearedAuth = false }

// Tạo instance axios
const authorizeAxiosInstance = axios.create({
  timeout: 1000 * 60 * 10,
  withCredentials: true // giữ nếu BE dùng cookie; nếu dùng header token, vẫn ok
})

// Request interceptor: bật loading, attach Bearer nếu có token lưu ở localStorage
authorizeAxiosInstance.interceptors.request.use(
  (config) => {
    interceptorLoadingElements(true)
    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        }
      }
    } catch (e) {
      // ignore
    }
    return config
  },
  (error) => {
    interceptorLoadingElements(false)
    return Promise.reject(error)
  }
)

// Helper: kiểm tra request là auth endpoint để tránh recursion
const isAuthEndpoint = (url = '') => {
  if (!url) return false
  const u = url.toLowerCase()
  return u.includes('/api/auth/login') ||
         u.includes('/api/auth/logout') ||
         u.includes('/api/auth/refresh') ||
         u.includes('/auth/login') ||
         u.includes('/auth/logout') ||
         u.includes('/auth/refresh')
}

// Response interceptor: tắt loading, xử lý 401 an toàn (không gọi thunk network)
authorizeAxiosInstance.interceptors.response.use(
  (response) => {
    interceptorLoadingElements(false)
    return response
  },
  (error) => {
    interceptorLoadingElements(false)

    const status = error.response?.status
    const reqUrl = error.config?.url || ''

    // 401 ngoài auth endpoints: clear local auth
    if (status === 401 && !isAuthEndpoint(reqUrl)) {
      if (!hasClearedAuth && axiosReduxStore) {
        try { axiosReduxStore.dispatch(clearCurrentUser()) } catch (e) { void e }
        hasClearedAuth = true
      }
    }

    // Lấy message từ backend (ưu tiên)
    const data = error.response?.data
    let errorMessage = 'An error occurred'
    if (typeof data === 'string') errorMessage = data
    else if (data?.message) errorMessage = String(data.message)
    else if (data?.error) errorMessage = String(data.error)
    else if (Array.isArray(data?.errors)) errorMessage = data.errors.join(', ')
    else if (data?.errors && typeof data.errors === 'object') {
      errorMessage = Object.values(data.errors).flat().join(', ')
    } else if (error.message) {
      errorMessage = error.message
    } else if (status) {
      errorMessage = `Request failed with status ${status}`
    }

    // Luôn toast lỗi (đơn giản, không ngoại lệ)
    toast.error(errorMessage)

    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status,
      backendMessage: data?.message,
      backendError: data?.error,
      finalMessage: errorMessage
    })

    // Gắn thêm message đã chuẩn hoá để phía gọi dùng (nếu cần)
    error.normalizedMessage = errorMessage
    return Promise.reject(error)
  }
)
// ...existing code...

export default authorizeAxiosInstance