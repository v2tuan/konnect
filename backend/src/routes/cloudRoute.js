import express from 'express'
import { cloudController } from '~/controllers/cloudController'
import authMiddleware from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.use('/')
  .get(authMiddleware, cloudController.fetchCloudConversation)

export const cloudRoutes = Router