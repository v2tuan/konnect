import express from 'express'
import { userController } from '~/controllers/userController'

const router = express.Router()

router.get('/search', userController.searchUser)

export const userRoute = router