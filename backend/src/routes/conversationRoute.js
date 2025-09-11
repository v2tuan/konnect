import express from 'express'
import { conversationController } from '~/controllers/conversationController'
import authMiddleware from '~/middlewares/authMiddleware'

const route = express.Router()

route.post('/', authMiddleware, conversationController.createConversation)
route.get('/', authMiddleware, conversationController.getConversation)

export const conversationRoute = route