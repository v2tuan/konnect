import axios from "axios"

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // nếu cần gửi cookie/session thì để true
})

// Optional: interceptor để xử lý token hoặc lỗi
axiosClient.interceptors.response.use(
  response => response,
  error => {
    console.error("API Error:", error)
    return Promise.reject(error)
  }
)

export default axiosClient
