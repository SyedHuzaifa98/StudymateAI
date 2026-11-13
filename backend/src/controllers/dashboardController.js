import Course from '../models/Course.js';
import Document from '../models/Document.js';
import QuizAttempt from '../models/QuizAttempt.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Courses count
    const totalCourses = await Course.countDocuments({ userId });
    const recentCourses = await Course.find({ userId })
      .sort({ lastStudiedAt: -1, updatedAt: -1 })
      .limit(4);

    // Enriched recent courses
    const enrichedRecent = await Promise.all(
      recentCourses.map(async c => {
        const docCount = await Document.countDocuments({ courseId: c._id, status: 'completed' });
        return {
          ...c.toObject(),
          docCount
        };
      })
    );

    // Quiz attempts
    const attempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 }).populate('courseId', 'title color');
    const totalQuizzes = attempts.length;

    let averageScore = 0;
    let lastQuiz = null;

    if (totalQuizzes > 0) {
      const sum = attempts.reduce((acc, curr) => acc + curr.percentage, 0);
      averageScore = Math.round(sum / totalQuizzes);
      lastQuiz = attempts[0];
    }

    // Overall weak topics
    const topicMap = {};
    attempts.forEach(att => {
      (att.topicPerformance || []).forEach(tp => {
        if (!topicMap[tp.topic]) topicMap[tp.topic] = { topic: tp.topic, total: 0, correct: 0, course: att.courseId?.title };
        topicMap[tp.topic].total += tp.total;
        topicMap[tp.topic].correct += tp.correct;
      });
    });

    const weakTopics = Object.values(topicMap)
      .map(tp => ({
        topic: tp.topic,
        course: tp.course,
        percentage: tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : 0
      }))
      .filter(tp => tp.percentage < 70)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3);

    return res.json({
      success: true,
      stats: {
        totalCourses,
        totalQuizzes,
        averageScore,
        lastQuiz: lastQuiz
          ? {
              score: lastQuiz.score,
              totalQuestions: lastQuiz.totalQuestions,
              percentage: lastQuiz.percentage,
              courseTitle: lastQuiz.courseId?.title || 'Course',
              courseId: lastQuiz.courseId?._id,
              createdAt: lastQuiz.createdAt
            }
          : null,
        recentCourses: enrichedRecent,
        weakTopicsReminder: weakTopics
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
