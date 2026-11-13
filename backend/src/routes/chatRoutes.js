import express from 'express';
import { handleAiTeacherChat } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.use(protect);

router.post('/', handleAiTeacherChat);

export default router;
