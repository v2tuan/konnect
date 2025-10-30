import express from 'express'
import { contactController } from '~/controllers/contactController'
import authMiddleware from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/friends/requests')
  .get(authMiddleware, contactController.getFriendRequests)
  .post(authMiddleware, contactController.submitRequest)
  .put(authMiddleware, contactController.updateStatusRequest)
Router.route('/friends')
  .get(authMiddleware, contactController.getAllFriends)
  
Router.delete('/friends/:friendUserId', authMiddleware, contactController.removeFriend)

export const contactRoutes = Router