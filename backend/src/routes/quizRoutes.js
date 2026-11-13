import express from 'express';
import { generateQuiz, getQuizzes, getQuizById, submitQuizAttempt } from '../controllers/quizController.js';
import { protect } from '../middleware/auth.js';

export const courseQuizRouter = express.Router({ mergeParams: true });
courseQuizRouter.use(protect);
courseQuizRouter.route('/')
  .post(generateQuiz)
  .get(getQuizzes);

export const quizRouter = express.Router();
quizRouter.use(protect);
quizRouter.route('/:id')
  .get(getQuizById);
quizRouter.route('/:id/attempts')
  .post(submitQuizAttempt);
