import express from 'express'
import { StatusCodes } from 'http-status-codes'  
import { authRoutes } from './authRoute'
import { cloudRoutes } from './cloudRoute'
const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({message: 'APIs V1 are ready to use, ', code: StatusCodes.OK })
})

Router.use('/auth', authRoutes)

Router.use('/cloud', cloudRoutes)

export const APIs_V1 = Router