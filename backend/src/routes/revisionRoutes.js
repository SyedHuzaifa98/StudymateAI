import express from 'express';
import { getCourseProgress, generateCourseRevision } from '../controllers/revisionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.use(protect);

router.get('/progress', getCourseProgress);
router.post('/revision', generateCourseRevision);

export default router;
