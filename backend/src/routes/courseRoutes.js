import express from 'express';
import { getCourses, createCourse, getCourseById, deleteCourse } from '../controllers/courseController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCourses)
  .post(createCourse);

router.route('/:id')
  .get(getCourseById)
  .delete(deleteCourse);

export default router;
