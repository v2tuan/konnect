import { combineReducers } from 'redux'
import { persistReducer } from 'redux-persist'
import { userReducer } from './user/userSlice'
import storage from 'redux-persist/lib/storage'
import { configureStore } from '@reduxjs/toolkit'

const rootPersistConfig = {
  key: 'root',
  storage: storage,
  whitelist: ['user']
}

const reducers = combineReducers({
  user: userReducer
})

const persistedReducer = persistReducer(rootPersistConfig, reducers)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false })
})