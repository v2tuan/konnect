import authorizeAxiosInstance from "@/utils/authorizeAxios"
import { API_ROOT } from "@/utils/constant"
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

const initialState = {
  currentUser: null
}

export const loginUserAPI = createAsyncThunk(
  "/auth/loginUserAPI",
  async (data) => {
    const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/login`, data)
    return response.data
  }
)

export const updateUserAPI = createAsyncThunk(
  "/auth/updateUserAPI",
  async (data) => {
    const response = await authorizeAxiosInstance.put(`${API_ROOT}/api/auth/update`, data)
    return response.data
  }
)
export const forgotPasswordAPI = createAsyncThunk(
    "/auth/forgotPasswordAPI",
    async (data) => {
        const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/forgot`, data)
        return response.data
    }
)
export const resetPasswordAPI = createAsyncThunk(
    "/auth/resetPasswordAPI",
    async (data) => {
        const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/reset-password`, data)
        return response.data
    }
)

export const logoutUserAPI = createAsyncThunk(
  "/auth/logoutUserAPI",
  async (data) => {
    const response = await authorizeAxiosInstance.post(`${API_ROOT}/api/auth/logout`, data)
    return response.data
  }
)

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
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

export const selectCurrentUser = (state) => {
  return state.user.currentUser
}

export const userReducer = userSlice.reducer