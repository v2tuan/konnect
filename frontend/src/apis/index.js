import authorizeAxiosInstance from "@/utils/authorizeAxios"
import axios from "axios"
import { API_ROOT } from "@/utils/constant"

export const checkAuth = async () => {
  try {
    const response = await axios.get(
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

export const forgotPasswordAPI = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/forgot`, data)
  return response.data
}

export const resetPasswordAPI = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/reset-password`, data)
  return response.data
}

