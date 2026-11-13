import Course from '../models/Course.js';
import Document from '../models/Document.js';
import { retrieveRelevantChunks } from '../services/ragService.js';
import { askAiTeacher } from '../services/groqService.js';

export const handleAiTeacherChat = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ message: 'Question cannot be empty.' });
    }

    // Verify course ownership
    const course = await Course.findOne({ _id: courseId, userId: req.user._id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    // Check if course has any indexed materials
    const completedDocs = await Document.countDocuments({ courseId, status: 'completed' });
    if (completedDocs === 0) {
      return res.json({
        success: true,
        answer: 'You have not uploaded any completed PDF notes for this course yet. Please upload course materials first so I can answer questions grounded in your notes!',
        sources: [],
        suggestedQuestions: [
          'How do I upload a PDF note?',
          'What topics does this course cover?'
        ]
      });
    }

    // Retrieve relevant chunks via cosine similarity (up to 5 chunks for complete context)
    const topChunks = await retrieveRelevantChunks(courseId, question, 5);

    // Call Groq AI Teacher
    const result = await askAiTeacher({
      question: question.trim(),
      contextChunks: topChunks,
      courseTitle: course.title
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
