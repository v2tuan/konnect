import { API_ROOT } from "@/utils/constant"
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import axios from "axios"

const initialState = {
  currentUser: null
}

export const loginUserAPI = createAsyncThunk(
  "/users/loginUserAPI",
  async (data) => {
    const response = await axios.post(`${API_ROOT}/api/auth/login`, data)
    return response.data
  }
)

export const updateUserAPI = createAsyncThunk(
  "/users/updateUserAPI",
  async (data) => {
    const response = await axios.put(`${API_ROOT}/api/auth/update`, data)
    return response.data
  }
)

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducer: {},
  extraReducers: (builder) => {
    builder.addCase(loginUserAPI.fulfilled,(state, action) => {
      state.currentUser = action.payload
    }),
    builder.addCase(updateUserAPI.fulfilled,(state, action) => {
      state.currentUser = action.payload
    })
  }
})

export const selectCurrentUser = (state) => {
  return state.user.currentUser
}

export const userReducer = userSlice.reducer