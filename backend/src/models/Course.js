import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Please provide course title'],
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    color: {
      type: String,
      default: '#4F46E5' // Indigo
    },
    lastStudiedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
