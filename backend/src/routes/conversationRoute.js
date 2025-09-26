import express from 'express'
import {conversationController} from '~/controllers/conversationController'
import {userController} from '~/controllers/userController'
import authMiddleware from '~/middlewares/authMiddleware'

const route = express.Router()

route.post('/', authMiddleware, conversationController.createConversation)
route.get('/', authMiddleware, conversationController.getConversation)
route.get('/:userId', authMiddleware, userController.selectedUser)
route.patch("/:id/read-to-latest", authMiddleware, conversationController.readToLatest);

route.route('/chats/:conversationId')
.get(authMiddleware, conversationController.fetchConversationDetail)
route.get("/unreads/summary", authMiddleware, conversationController.getUnreadSummary)
route.get('/:id/media', authMiddleware, conversationController.listConversationMedia);   // <-- mới


export const conversationRoutes = route