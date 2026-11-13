import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
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
    originalName: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    pageCount: {
      type: Number,
      default: 0
    },
    totalChunks: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentSchema);
