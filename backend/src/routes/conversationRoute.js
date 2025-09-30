import express from 'express'
import {conversationController} from '~/controllers/conversationController'
import {userController} from '~/controllers/userController'
import authMiddleware from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const route = express.Router()

route.post('/', authMiddleware,multerUploadMiddleware.upload.single('avatarUrl'), conversationController.createConversation)
route.get('/', authMiddleware, conversationController.getConversation)
route.get('/:userId', authMiddleware, userController.selectedUser)
route.patch("/:id/read-to-latest", authMiddleware, conversationController.readToLatest);

route.route('/chats/:conversationId')
.get(authMiddleware, conversationController.fetchConversationDetail)
.delete(authMiddleware, conversationController.handleConversationActions)

route.get("/unreads/summary", authMiddleware, conversationController.getUnreadSummary)
route.get('/:id/media', authMiddleware, conversationController.listConversationMedia);   // <-- mới


export const conversationRoutes = route