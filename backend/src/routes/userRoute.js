import express from 'express'
import { userController } from '~/controllers/userController'
import authMiddleware from '~/middlewares/authMiddleware'

const router = express.Router()

router.get('/search', userController.searchUser)
router.get('/findUser', authMiddleware, userController.searchUserById)

export const userRoute = router