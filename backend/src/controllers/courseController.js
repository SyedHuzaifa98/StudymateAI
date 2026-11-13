import Course from '../models/Course.js';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    
    // Enrich with document count and quiz count
    const enriched = await Promise.all(
      courses.map(async (course) => {
        const docCount = await Document.countDocuments({ courseId: course._id, status: 'completed' });
        const quizCount = await Quiz.countDocuments({ courseId: course._id });
        return {
          ...course.toObject(),
          docCount,
          quizCount
        };
      })
    );

    return res.json({ success: true, courses: enriched });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { title, description, color } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Course title is required.' });
    }

    const course = await Course.create({
      userId: req.user._id,
      title: title.trim(),
      description: description?.trim() || '',
      color: color || '#4F46E5'
    });

    return res.status(201).json({ success: true, course });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, userId: req.user._id });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    // Update lastStudiedAt timestamp
    course.lastStudiedAt = new Date();
    await course.save();

    const docCount = await Document.countDocuments({ courseId: course._id, status: 'completed' });
    const quizCount = await Quiz.countDocuments({ courseId: course._id });

    return res.json({
      success: true,
      course: {
        ...course.toObject(),
        docCount,
        quizCount
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, userId: req.user._id });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    // Cascade delete documents, chunks, quizzes, and attempts
    await DocumentChunk.deleteMany({ courseId: course._id });
    await Document.deleteMany({ courseId: course._id });
    await QuizAttempt.deleteMany({ courseId: course._id });
    await Quiz.deleteMany({ courseId: course._id });
    await Course.findByIdAndDelete(course._id);

    return res.json({ success: true, message: 'Course and related materials deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
