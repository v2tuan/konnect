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
export const fetchConversationMedia = async ({ conversationId, type, page = 1, limit = 24, q = "" }) => {
  if (!conversationId) return { data: [], paging: { hasMore: false, nextPage: null } }
  const params = { page, limit }
  if (type) params.type = type
  if (q) params.q = q
  const { data } = await authorizeAxiosInstance.get(`${API_ROOT}/api/conversation/${conversationId}/media`, { params })
  return data
}

// 🔕 Mute
export const muteConversation = async (conversationId, duration) => {
  // (tuỳ chọn) validate runtime cho an toàn
  const allowed = [2, 4, 8, 12, 24, "forever"]
  if (!allowed.includes(duration)) {
    throw new Error("duration must be one of 2,4,8,12,24,'forever'")
  }

  const { data } = await authorizeAxiosInstance.patch(
    `${API_ROOT}/api/conversation/${conversationId}/notifications`,
    { muted: true, duration }
  )
  return data
}

export const unmuteConversation = async (conversationId) => {
  const { data } = await authorizeAxiosInstance.patch(
    `${API_ROOT}/api/conversation/${conversationId}/notifications`,
    { muted: false }
  )
  return data
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
  console.log('🌐 API call: fetchConversationDetail', conversationId, params) // Debug log
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/conversation/chats/${conversationId}`, { params })
  console.log('✅ API response:', response.data) // Debug log
  return response.data
}

export const getFriendRequestsAPI = async ({ params = {} }) => {
  const response = await authorizeAxiosInstance.get(`${API_ROOT}/api/contacts/friends/requests`, { params })
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
  try {
    // 1. Gọi API gốc
    const response = await _originalUpdateFriendRequestStatusAPI({ requestId, action });

    // 2. Nếu thành công, phát tín hiệu (event) toàn cục
    window.dispatchEvent(new CustomEvent('friendship:action', {
      detail: {
        requestId: requestId,
        action: action
      }
    }));

    // 3. Trả về kết quả
    return response;

  } catch (error) {
    // Nếu API lỗi, ném lỗi ra để component tự .catch()
    console.error("updateFriendRequestStatusAPI failed, event not dispatched:", error);
    throw error;
  }
}
// Đổi tên hàm gốc (hoặc không export)
const _originalUpdateFriendRequestStatusAPI = async ({ requestId, action }) => {
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

export const deleteConversationAPI = async (conversationId) => {
  const response = await authorizeAxiosInstance.delete(`${API_ROOT}/api/conversation/chats/${conversationId}`, {
    data: { action: 'delete' }
  })
  return response.data
}

export const leaveGroupAPI = async (conversationId) => {
  const response = await authorizeAxiosInstance.delete(`${API_ROOT}/api/conversation/chats/${conversationId}`, {
    data: { action: 'leave' }
  })
  return response.data
}

export const addMemberToGroup = async (conversationId, memberIds) => {
  // BE của bạn parse được cả array lẫn JSON string. Gửi array là đủ.
  const response = await authorizeAxiosInstance.delete(
    `${API_ROOT}/api/conversation/chats/${conversationId}`,
    { data: { action: 'add', memberIds } }
  )
  return response.data
}
// ======================== NOTIFICATION APIs ========================
export async function listNotifications({
                                          cursor = null,
                                          limit = 20,
                                          onlyUnread = false,
                                          type = null // ⬅️ THÊM VÀO
                                        } = {}) {
  const params = {};
  if (cursor) params.cursor = cursor;
  if (limit) params.limit = limit;
  if (onlyUnread) params.onlyUnread = true;
  if (type) params.type = type; // ⬅️ THÊM DÒNG NÀY

  const { data } = await authorizeAxiosInstance.get(`${API_ROOT}/api/notification`, { params });
  // Chuẩn hoá: support cả array hoặc {items:[...]}
  return Array.isArray(data) ? data : (data?.items || []);
}
export async function markAllNotificationsRead({ type = null, conversationId = null } = {}) {
  const body = {}
  if (type) body.type = type
  if (conversationId) body.conversationId = conversationId
  const res = await authorizeAxiosInstance.put(`${API_ROOT}/api/notification/mark-all-read`, body)
  return res.data || { modified: 0 }
}

export async function markNotificationsRead(ids = []) {
  const res = await authorizeAxiosInstance.put(`${API_ROOT}/api/notification/mark-read`, { ids })
  return res.data || { modified: 0 }
}

export async function unreadCount() {
  const res = await authorizeAxiosInstance.get(`${API_ROOT}/api/notification/unread-count`)
  return Number(res.data?.count || 0)
}
