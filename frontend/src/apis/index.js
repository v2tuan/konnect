import authorizeAxiosInstance from "@/utils/authorizeAxios"
import axios from "axios"
import { API_ROOT } from "@/utils/constant"

/* ======================== AUTH APIs ======================== */

/**
 * Kiểm tra trạng thái đăng nhập của user
 */
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

/**
 * Đăng ký tài khoản mới
 */
export const registerUserAPI = async (data) => {
  const response = await axios.post(`${API_ROOT}/api/auth/register`, data)
  return response.data
}

/**
 * Quên mật khẩu (gửi email reset)
 */
export const forgotPasswordAPI = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/forgot`, data)
  return response.data
}

/**
 * Đặt lại mật khẩu sau khi xác minh
 */
export const resetPasswordAPI = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/reset-password`, data)
  return response.data
}

/* ======================== USER APIs ======================== */

/**
 * Tìm user theo username (search)
 */
export const searchUserByUsername = async (keyword) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/search`, {
    params: { keyword }
  })
  return response.data
}

/**
 * Tìm user theo userId
 */
export const findUserById = async (userId) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/findUser`, {
    params: { userId }
  })
  return response.data
}

export const getDisplayUsers = async (userIds) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/display`, {
    userIds
  })
  return response.data
}

/* ======================== CONVERSATION APIs ======================== */

/**
 * Lấy danh sách cloud conversation
 */
export const getCloudConversation = async () => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/cloud`)
  return response.data
}

/**
 * Lấy danh sách các conversation
 */
export const getConversations = async (page, limit) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/conversation`, {
    params: {
      page,
      limit
    }
  })

  return response.data
}

/**
 * Lấy conversation từ userId
 */
export const getConversationByUserId = async (userId) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/conversation/${userId}`)
  return response.data
}

/**
 * Tạo conversation mới
 */
export const createConversation = async (data) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/conversation`, data, {
    headers: { "Content-Type": "multipart/form-data" }
  })
  return response.data
}

/* ======================== MESSAGE APIs ======================== */

/**
 * Gửi tin nhắn trong conversation
 */
export const sendMessage = async (conversationId, payload, isFormData) => {
  if (isFormData) {
    // Nếu payload là FormData (file, image, audio)
    payload.append("conversationId", conversationId)
    const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/messages`, payload, {
      headers: { "Content-Type": "multipart/form-data" }
    })
    return response.data
  }
  // Nếu payload là object (text)
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/messages`, {
    conversationId,
    ...payload
  })
  return response.data
}

/**
 * set reaction cho message
 */
export const setReaction = async (messageId, emoji) => {
  const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/messages/reaction`, {
    messageId,
    emoji
  })
  return response.data
}

export const fetchConversationDetail = async (conversationId, params = {}) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/conversation/chats/${conversationId}`, {params})
  return response.data
}

export const getFriendRequestsAPI = async ({params = {}}) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/contacts/friends/requests`, {params})
  return response.data
}

export const submitFriendRequestAPI = async (toUserId) => {
  const response = await authorizeAxiosInstance.post(
    `${API_ROOT}/api/contacts/friends/requests`,
    { toUserId }
  )
  return response.data
}

export const updateFriendRequestStatusAPI = async ({ requestId, action }) => {
  const response = await authorizeAxiosInstance.put(
    `${API_ROOT}/api/contacts/friends/requests`,
    { requestId, action }
  )
  return response.data
}

export const getFriendsAPI = async (params = {}) => {
  const response = await authorizeAxiosInstance.get(
    `${API_ROOT}/api/contacts/friends`,
    { params }
  )
  return response.data
}