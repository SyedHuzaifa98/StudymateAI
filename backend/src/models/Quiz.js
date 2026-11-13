import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      required: true,
      validate: [val => val.length >= 2, 'Quiz question must have at least 2 options']
    },
    correctAnswer: {
      type: String,
      required: true
    },
    explanation: {
      type: String,
      default: ''
    },
    topic: {
      type: String,
      default: 'General'
    }
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    topic: {
      type: String,
      default: 'Comprehensive'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    questions: [questionSchema]
  },
  { timestamps: true }
);

export default mongoose.model('Quiz', quizSchema);
