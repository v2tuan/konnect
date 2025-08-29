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

    // Nếu 401 và không phải gọi auth endpoint -> chỉ clear state local (sync)
    if (status === 401 && !isAuthEndpoint(reqUrl)) {
      if (!hasClearedAuth && axiosReduxStore) {
        try {
          axiosReduxStore.dispatch(clearCurrentUser())
        } catch (e) {
          // silent
        }
        hasClearedAuth = true
      }
    }

    // Chuẩn hóa thông báo lỗi
    let errorMessage = 'An error occurred'
    if (error.response?.data?.message) errorMessage = error.response.data.message
    else if (error.response?.data?.error) errorMessage = error.response.data.error
    else if (status) {
      switch (status) {
      case 400: errorMessage = 'Bad request - Invalid data'; break
      case 403: errorMessage = 'Access denied - You do not have permission'; break
      case 404: errorMessage = 'Resource not found'; break
      case 500: errorMessage = 'Server error - Please try again later'; break
      default: errorMessage = `Request failed with status ${status}`
      }
    } else if (error.message) {
      errorMessage = error.message
    }

    // Hiện toast cho mọi lỗi trừ 401/410 (401 đã xử lý bằng clearCurrentUser)
    if (status !== 401 && status !== 410) {
      toast.error(errorMessage)
    }

    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status,
      backendMessage: error.response?.data?.message,
      backendError: error.response?.data?.error,
      finalMessage: errorMessage
    })

    return Promise.reject(error)
  }
)

export default authorizeAxiosInstance