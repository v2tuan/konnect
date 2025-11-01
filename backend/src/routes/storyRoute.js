import express from 'express';
import { storyController } from '~/controllers/storyController';
import authMiddleware from '~/middlewares/authMiddleware';
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware';

const router = express.Router();

router.post('/', authMiddleware, multerUploadMiddleware.upload.single('file'), storyController.createStory);
router.get('/', authMiddleware, storyController.getStoriesByUserIds);
router.get('/all', authMiddleware, storyController.getStoriesByFriends)
export const storyRoute = router;