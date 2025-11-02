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
route.patch("/:id/notifications", authMiddleware, conversationController.updateNotifications);
route.patch(
  '/chats/:conversationId/meta',
  authMiddleware,
  multerUploadMiddleware.upload.single('avatar'),       // field 'avatar'
  conversationController.updateGroupMeta
);

route.delete(
  '/chats/:conversationId/members',
  authMiddleware,
  conversationController.removeMembers
);

route.patch(
  '/chats/:conversationId/members',
  authMiddleware,
  conversationController.updateMemberRole
);
route.patch(
  '/chats/:conversationId/members/nickname',
  authMiddleware,
  conversationController.updateMemberNickname
);
route.post('/join/:conversationId', authMiddleware, conversationController.joinGroupViaLink);
route.get('/group-preview/:conversationId', authMiddleware, conversationController.getGroupPreview);
export const conversationRoutes = route