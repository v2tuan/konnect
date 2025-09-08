import express from 'express'
import { conversationController } from '~/controllers/conversationController'
import authMiddleware from '~/middlewares/authMiddleware'

const route = express.Router()

route.post('/', authMiddleware, conversationController.createConversation)

export const conversationRoute = route