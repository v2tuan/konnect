import authorizeAxiosInstance from "@/utils/authorizeAxios"
import { API_ROOT } from "@/utils/constant"

export const checkAuth = async () => {
  try {
    const response = await authorizeAxiosInstance.get(
      `${API_ROOT}/api/auth/check`,
      { withCredentials: true }
    )

    // Nếu server trả về authenticated = true
    if (response.status === 200 && response.data?.authenticated) {
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error("Check auth failed:", error)
    return false
  }
}
