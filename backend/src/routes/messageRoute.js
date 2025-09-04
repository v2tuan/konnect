import express from 'express'
import { messageController } from '~/controllers/messageController'
import authMiddleware from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/')
  .get(authMiddleware, messageController.listMessages)
  .post(authMiddleware, messageController.sendMessage)

export const messageRoutes = Router