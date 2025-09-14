import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import authorizeAxiosInstance from "@/utils/authorizeAxios"
import { API_ROOT } from "@/utils/constant"

const initialState = {
  currentUser: null,
  usersById: {} //catche nhieu user
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
      if (state.currentUser?._id === userId) {
        state.currentUser = {
          ...state.currentUser,
          status: { ...(state.currentUser.status || {}), isOnline, lastActiveAt }
        }
      }
      const u = state.usersById[userId]
      if (u) {
        state.usersById[userId] = {
          ...u,
          status: { ...(u.status || {}), isOnline, lastActiveAt }
        }
      }
    },
    upsertUsers: (state, action) => {
      (action.payload || []).forEach(u => {
        state.usersById[u._id] = u
      })
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

export const { clearCurrentUser, setUserStatus, upsertUsers } = userSlice.actions

export const selectCurrentUser = (state) => state.user.currentUser

export const userReducer = userSlice.reducer
