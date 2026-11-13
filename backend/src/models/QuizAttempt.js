import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        questionIndex: Number,
        questionText: String,
        selectedAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean,
        explanation: String,
        topic: String
      }
    ],
    score: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    topicPerformance: [
      {
        topic: String,
        total: Number,
        correct: Number,
        percentage: Number
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model('QuizAttempt', quizAttemptSchema);
