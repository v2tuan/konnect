import axios from "axios"
import { useRouter } from "next/navigation"

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

// ✅ Interceptor response — để bắt lỗi từ server
axiosClient.interceptors.response.use(
  (response) => response, // nếu thành công thì trả về luôn
  (error) => {
    // Nếu backend trả về 401 => Token hết hạn hoặc không hợp lệ
    // const router = useRouter()
    if (error.response?.status === 401) {
      console.warn("Unauthorized — logging out...")

      // Xoá token localStorage (nếu bạn lưu ở đó)
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
      }
      // Nếu dùng cookie httpOnly thì không cần xoá gì cả, chỉ cần chuyển hướng vì khi gặp 401 thì trình duyệt sẽ tự động xoá cookie
      
      // Chuyển hướng về trang đăng nhập
      window.location.href = "/"
      // router.push("/")
    }

    return Promise.reject(error)
  }
)

export default axiosClient
