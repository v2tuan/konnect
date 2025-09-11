import express from 'express'
import { StatusCodes } from 'http-status-codes'  
import { authRoutes } from './authRoute'
import { cloudRoutes } from './cloudRoute'
import { messageRoutes } from './messageRoute'
import { userRoute } from './userRoute'
import { conversationRoute } from './conversationRoute'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({message: 'APIs V1 are ready to use, ', code: StatusCodes.OK })
})

Router.use('/auth', authRoutes)
Router.use(userRoute)

Router.use('/cloud', cloudRoutes)

Router.use('/messages', messageRoutes)

Router.use('/conversation', conversationRoute)

export const APIs_V1 = Router