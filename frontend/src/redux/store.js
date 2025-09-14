import { combineReducers } from 'redux'
import { persistReducer } from 'redux-persist'
import { userReducer } from './user/userSlice'
import storage from 'redux-persist/lib/storage'
import { configureStore } from '@reduxjs/toolkit'
import { presenceListener } from '@/middlewares/presenceListener'

const rootPersistConfig = {
  key: 'root',
  storage: storage,
  whitelist: ['user'],
  blacklist: ['usersById']
}

const reducers = combineReducers({
  user: userReducer
})

const persistedReducer = persistReducer(rootPersistConfig, reducers)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).prepend(presenceListener.middleware)

})