import express from 'express'
import { messageController } from '~/controllers/messageController'
import authMiddleware from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/:conversationId')
  .get(authMiddleware, messageController.listMessages)

Router.route('/')
  .post(authMiddleware, messageController.sendMessage)

export const messageRoutes = Router