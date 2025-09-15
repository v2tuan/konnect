import express from 'express'
import { contactController } from '~/controllers/contactController'
import authMiddleware from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/friends/requests')
  .get(authMiddleware, contactController.getFriendRequests)

export const contactRoutes = Router