import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import authorizeAxiosInstance from "@/utils/authorizeAxios"
import { API_ROOT } from "@/utils/constant"

const initialState = {
  currentUser: null,
  usersById: {} // cache nhiều user theo id chuẩn hóa
}

// Helper chuẩn hóa user (gộp các biến thể id, username, avatar)
function normalizeUser(raw) {
  if (!raw) return null
  const id = raw._id || raw.id
  if (!id) return null
  return {
    ...raw,
    _id: id,
    id, // giữ cả hai để code cũ không vỡ
    username: raw.username || raw.userName || raw.user_name || raw.user || raw.Username || raw.USERNAME || raw.userName, // phòng nhiều biến thể
    avatarUrl: raw.avatarUrl || raw.avatarURL || raw.avatar || null,
    status: raw.status || { isOnline: false, lastActiveAt: null }
  }
}

export const loginUserAPI = createAsyncThunk(
  "/auth/loginUserAPI",
  async (data) => {
    const res = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/login`, data)
    return res.data
  }
)

export const updateUserAPI = createAsyncThunk(
  "/auth/updateUserAPI",
  async (data) => {
    const res = await authorizeAxiosInstance.put(`${API_ROOT}/api/auth/update`, data)
    return res.data
  }
)

export const logoutUserAPI = createAsyncThunk(
  "/auth/logoutUserAPI",
  async () => {
    const res = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/logout`)
    return res.data
  }
)

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearCurrentUser: (state) => { state.currentUser = null },
    setUserStatus: (state, action) => {
      const { userId, isOnline, lastActiveAt } = action.payload || {}
      if (!userId) return
      if (!state.usersById) state.usersById = {}
      if (state.currentUser?._id === userId) {
        state.currentUser = {
          ...state.currentUser,
          status: { ...(state.currentUser.status || {}), isOnline, lastActiveAt }
        }
      }
      const existing = state.usersById[userId]
      if (existing) {
        state.usersById[userId] = {
          ...existing,
          status: { ...(existing.status || {}), isOnline, lastActiveAt }
        }
      } else {
        state.usersById[userId] = {
          _id: userId,
          id: userId,
          status: { isOnline, lastActiveAt }
        }
      }
    },
    upsertUsers: (state, action) => {
      if (!state.usersById) state.usersById = {}
      ;(action.payload || []).forEach(raw => {
        const n = normalizeUser(raw)
        if (!n) return
        state.usersById[n._id] = {
          ...(state.usersById[n._id] || {}),
          ...n
        }
      })
    },
    // Sửa lỗi key 'undefined' trong usersById do dữ liệu cũ
    repairUsersMap: (state) => {
      if (!state.usersById) state.usersById = {}
      if (Object.prototype.hasOwnProperty.call(state.usersById, 'undefined')) {
        const bad = state.usersById.undefined
        delete state.usersById.undefined
        if (bad) {
          const fixed = normalizeUser(bad)
            || (bad.id ? { _id: bad.id, id: bad.id, ...bad } : null)
          if (fixed && fixed._id) {
            state.usersById[fixed._id] = {
              ...(state.usersById[fixed._id] || {}),
              ...fixed
            }
          }
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUserAPI.fulfilled, (state, action) => {
        state.currentUser = action.payload
      })
      .addCase(updateUserAPI.fulfilled, (state, action) => {
        state.currentUser = action.payload
      })
      .addCase(logoutUserAPI.fulfilled, (state) => {
        state.currentUser = null
      })
  }
})

export const { clearCurrentUser, setUserStatus, upsertUsers, repairUsersMap } = userSlice.actions

export const selectCurrentUser = (state) => state.user.currentUser

export const userReducer = userSlice.reducer
