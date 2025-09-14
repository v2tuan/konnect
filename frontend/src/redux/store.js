import { combineReducers } from 'redux'
import { persistReducer, createTransform } from 'redux-persist'
import { userReducer } from './user/userSlice'
import storage from 'redux-persist/lib/storage'
import { configureStore } from '@reduxjs/toolkit'
import { presenceListener } from '@/middlewares/presenceListener'

// Transform để loại bỏ field volatile (usersById) khỏi persist và sửa key lỗi
const stripVolatileTransform = createTransform(
  // transform state on its way to being serialized and persisted.
  (inboundState, key) => {
    if (key === 'user') {
      const { usersById, ...rest } = inboundState || {}
      // usersById deliberately dropped from persistence
      void usersById
      return rest
    }
    return inboundState
  },
  // transform state being rehydrated
  (outboundState, key) => {
    if (key === 'user') {
      return {
        usersById: {},
        ...outboundState
      }
    }
    return outboundState
  }
)

const rootPersistConfig = {
  key: 'root',
  storage: storage,
  whitelist: ['user'],
  transforms: [stripVolatileTransform]
}

const reducers = combineReducers({
  user: userReducer
})

const persistedReducer = persistReducer(rootPersistConfig, reducers)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).prepend(presenceListener.middleware)

})