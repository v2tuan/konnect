import express from 'express'
import { messageController } from '~/controllers/messageController'
import authMiddleware from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

Router.route('/:conversationId')
  .get(authMiddleware, messageController.listMessages)
  .delete(authMiddleware, messageController.deleteMessages)

Router.route('/')
  .post(authMiddleware,multerUploadMiddleware.upload.array('file', 10), messageController.sendMessage)

Router.route('/reaction')
  .post(authMiddleware, messageController.setReaction)

Router.route('/reaction')
  .delete(authMiddleware, messageController.removeReaction)

export const messageRoutes = Router