import express from 'express'
import { cloudController } from '~/controllers/cloudController'
import authMiddleware from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/')
  .get(authMiddleware, cloudController.fetchCloudConversation)

export const cloudRoutes = Router