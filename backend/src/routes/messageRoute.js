import express from 'express'
import { messageController } from '~/controllers/messageController'
import authMiddleware from '~/middlewares/authMiddleware'

const router = express.Router()

router.use('/')
  .get(authMiddleware, messageController.listMessages)
  .post(authMiddleware, messageController.sendMessage)

export const messageRoutes = router