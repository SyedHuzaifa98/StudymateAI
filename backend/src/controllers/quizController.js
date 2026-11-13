import Course from '../models/Course.js';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { generateQuizFromContent } from '../services/groqService.js';
import { retrieveRelevantChunks } from '../services/ragService.js';

export const generateQuiz = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { difficulty = 'medium', count = 5, focusTopic } = req.body;

    const course = await Course.findOne({ _id: courseId, userId: req.user._id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    const completedDocs = await Document.countDocuments({ courseId, status: 'completed' });
    if (completedDocs === 0) {
      return res.status(400).json({
        message: 'Please upload and process at least one PDF note before generating a quiz.'
      });
    }

    // Retrieve chunks for context
    let contextChunks = [];
    if (focusTopic && focusTopic.trim() !== '') {
      contextChunks = await retrieveRelevantChunks(courseId, focusTopic, 6);
    } else {
      // Sample chunks evenly across the course
      contextChunks = await DocumentChunk.find({ courseId }).limit(10).lean();
    }

    if (contextChunks.length === 0) {
      return res.status(400).json({ message: 'No content available to generate quiz questions.' });
    }

    // Generate questions with Groq
    const questions = await generateQuizFromContent({
      courseTitle: course.title,
      contextChunks,
      difficulty,
      count: Math.min(Math.max(parseInt(count) || 5, 3), 10),
      focusTopic
    });

    const quiz = await Quiz.create({
      courseId,
      userId: req.user._id,
      title: focusTopic ? `${course.title} - ${focusTopic} Quiz` : `${course.title} Practice Quiz`,
      topic: focusTopic || 'Comprehensive',
      difficulty,
      questions
    });

    // Return quiz to client without exposing correct answers in the response if it's meant to be taken
    const sanitizedQuestions = quiz.questions.map(q => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      topic: q.topic
    }));

    return res.status(201).json({
      success: true,
      quiz: {
        _id: quiz._id,
        courseId: quiz.courseId,
        title: quiz.title,
        difficulty: quiz.difficulty,
        topic: quiz.topic,
        questions: sanitizedQuestions,
        createdAt: quiz.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const quizzes = await Quiz.find({ courseId, userId: req.user._id }).sort({ createdAt: -1 });

    // Include last attempt score if any
    const enriched = await Promise.all(
      quizzes.map(async q => {
        const lastAttempt = await QuizAttempt.findOne({ quizId: q._id, userId: req.user._id }).sort({ createdAt: -1 });
        return {
          _id: q._id,
          title: q.title,
          difficulty: q.difficulty,
          topic: q.topic,
          questionCount: q.questions.length,
          createdAt: q.createdAt,
          lastAttempt: lastAttempt
            ? {
                score: lastAttempt.score,
                total: lastAttempt.totalQuestions,
                percentage: lastAttempt.percentage,
                createdAt: lastAttempt.createdAt
              }
            : null
        };
      })
    );

    return res.json({ success: true, quizzes: enriched });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or unauthorized.' });
    }

    // Check if user already took this quiz
    const lastAttempt = await QuizAttempt.findOne({ quizId: quiz._id, userId: req.user._id }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      quiz: {
        _id: quiz._id,
        courseId: quiz.courseId,
        title: quiz.title,
        difficulty: quiz.difficulty,
        topic: quiz.topic,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          topic: q.topic,
          // Expose correct answer & explanation only if already attempted
          correctAnswer: lastAttempt ? q.correctAnswer : undefined,
          explanation: lastAttempt ? q.explanation : undefined
        })),
        createdAt: quiz.createdAt
      },
      lastAttempt
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Server-side scoring for quiz submissions
 */
export const submitQuizAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of { questionIndex: number, selectedAnswer: string }

    const quiz = await Quiz.findOne({ _id: id, userId: req.user._id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or unauthorized.' });
    }

    let score = 0;
    const scoredAnswers = [];
    const topicStats = {};

    quiz.questions.forEach((q, idx) => {
      const studentSubmission = (answers || []).find(a => a.questionIndex === idx || (a.questionId && a.questionId.toString() === q._id.toString()));
      const selected = studentSubmission ? studentSubmission.selectedAnswer : '';
      const isCorrect = selected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

      if (isCorrect) {
        score++;
      }

      const questionTopic = q.topic || 'General';
      if (!topicStats[questionTopic]) {
        topicStats[questionTopic] = { total: 0, correct: 0 };
      }
      topicStats[questionTopic].total++;
      if (isCorrect) {
        topicStats[questionTopic].correct++;
      }

      scoredAnswers.push({
        questionId: q._id,
        questionIndex: idx,
        questionText: q.question,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        topic: questionTopic
      });
    });

    const totalQuestions = quiz.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const topicPerformance = Object.keys(topicStats).map(t => ({
      topic: t,
      total: topicStats[t].total,
      correct: topicStats[t].correct,
      percentage: Math.round((topicStats[t].correct / topicStats[t].total) * 100)
    }));

    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      courseId: quiz.courseId,
      userId: req.user._id,
      answers: scoredAnswers,
      score,
      totalQuestions,
      percentage,
      topicPerformance
    });

    return res.status(201).json({
      success: true,
      attempt
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
