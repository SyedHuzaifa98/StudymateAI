import Course from '../models/Course.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { retrieveRelevantChunks } from '../services/ragService.js';
import { generateRevisionGuide } from '../services/groqService.js';

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, userId: req.user._id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    const attempts = await QuizAttempt.find({ courseId, userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('quizId', 'title difficulty topic');

    if (attempts.length === 0) {
      return res.json({
        success: true,
        totalAttempts: 0,
        averageScore: 0,
        topicPerformance: [],
        weakTopics: [],
        attempts: []
      });
    }

    // Aggregate topic performance across all attempts
    const topicMap = {};
    let totalScore = 0;
    let totalQuestions = 0;

    attempts.forEach(att => {
      totalScore += att.score;
      totalQuestions += att.totalQuestions;

      (att.topicPerformance || []).forEach(tp => {
        if (!topicMap[tp.topic]) {
          topicMap[tp.topic] = { topic: tp.topic, total: 0, correct: 0 };
        }
        topicMap[tp.topic].total += tp.total;
        topicMap[tp.topic].correct += tp.correct;
      });
    });

    const topicPerformance = Object.values(topicMap).map(tp => ({
      topic: tp.topic,
      total: tp.total,
      correct: tp.correct,
      percentage: tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : 0
    }));

    // Weak topics are topics with percentage < 70% or lowest score
    topicPerformance.sort((a, b) => a.percentage - b.percentage);
    const weakTopics = topicPerformance.filter(tp => tp.percentage < 70);

    const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    return res.json({
      success: true,
      totalAttempts: attempts.length,
      averageScore,
      topicPerformance,
      weakTopics: weakTopics.length > 0 ? weakTopics : topicPerformance.slice(0, 2),
      recentAttempts: attempts.slice(0, 10)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const generateCourseRevision = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { topic } = req.body;

    const course = await Course.findOne({ _id: courseId, userId: req.user._id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    // Get progress to identify weak topics
    const attempts = await QuizAttempt.find({ courseId, userId: req.user._id }).sort({ createdAt: -1 });

    const topicMap = {};
    attempts.forEach(att => {
      (att.topicPerformance || []).forEach(tp => {
        if (!topicMap[tp.topic]) topicMap[tp.topic] = { topic: tp.topic, total: 0, correct: 0 };
        topicMap[tp.topic].total += tp.total;
        topicMap[tp.topic].correct += tp.correct;
      });
    });

    let targetTopics = [];
    if (topic && topic.trim() !== '') {
      targetTopics = [{ topic: topic.trim(), percentage: 50 }];
    } else {
      const sorted = Object.values(topicMap)
        .map(tp => ({
          topic: tp.topic,
          percentage: tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : 0
        }))
        .sort((a, b) => a.percentage - b.percentage);

      targetTopics = sorted.length > 0 ? sorted.slice(0, 3) : [{ topic: 'Core Concepts', percentage: 0 }];
    }

    // Retrieve context chunks for the primary weak topic
    const primaryTopic = targetTopics[0].topic;
    const contextChunks = await retrieveRelevantChunks(courseId, primaryTopic, 5);

    const revisionPlan = await generateRevisionGuide({
      courseTitle: course.title,
      weakTopics: targetTopics,
      contextChunks
    });

    return res.json({
      success: true,
      weakTopics: targetTopics,
      revision: revisionPlan
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
