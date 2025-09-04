import express from 'express'
import { StatusCodes } from 'http-status-codes'  
import { authRoutes } from './authRoute'
import { userRoute } from './userRoute'
const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({message: 'APIs V1 are ready to use, ', code: StatusCodes.OK })
})

Router.use('/auth', authRoutes)
Router.use(userRoute)

export const APIs_V1 = Router