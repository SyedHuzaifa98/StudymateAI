import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import CreateCourseModal from '../components/CreateCourseModal';
import {
  Plus,
  BookOpen,
  FileText,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, statsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/dashboard/stats')
      ]);
      setCourses(coursesRes.data.courses || []);
      setStats(statsRes.data.stats || null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCourseCreated = async (courseData) => {
    await api.post('/courses', courseData);
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Study Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Organize your notes, ask AI questions, and conquer your weak topics.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create New Course
        </button>
      </div>

      {/* Overview Cards / Last Quiz & Weak Topics Reminder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Last Quiz Score */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-lg shadow-indigo-100 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-200">Recent Quiz Performance</span>
              <Award className="w-5 h-5 text-indigo-200" />
            </div>
            {stats?.lastQuiz ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold">{stats.lastQuiz.percentage}%</span>
                  <span className="text-indigo-200 text-sm font-medium">
                    ({stats.lastQuiz.score}/{stats.lastQuiz.totalQuestions} correct)
                  </span>
                </div>
                <p className="text-indigo-100 text-sm mt-1 line-clamp-1 font-medium">
                  {stats.lastQuiz.courseTitle}
                </p>
              </div>
            ) : (
              <div>
                <span className="text-2xl font-bold text-indigo-100">No quizzes taken yet</span>
                <p className="text-indigo-200 text-xs mt-1">Upload notes to generate your first test!</p>
              </div>
            )}
          </div>

          {stats?.lastQuiz && (
            <Link
              to={`/course/${stats.lastQuiz.courseId}/progress`}
              className="mt-4 relative z-10 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl w-fit transition-all"
            >
              View Quiz Breakdown <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 2: Revision Reminder / Weak Topics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Revision Reminder</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>

            {stats?.weakTopicsReminder && stats.weakTopicsReminder.length > 0 ? (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-slate-600">Focus on these concepts to improve exam scores:</p>
                {stats.weakTopicsReminder.map((wt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-100 text-xs">
                    <span className="font-semibold text-slate-800 truncate">{wt.topic}</span>
                    <span className="font-bold text-amber-700 shrink-0 ml-2">{wt.percentage}% accuracy</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2">
                <p className="text-slate-800 font-semibold text-sm">All clear! No weak topics detected.</p>
                <p className="text-xs text-slate-500 mt-1">Keep challenging yourself with higher difficulty quizzes.</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Overall Avg Score:</span>
            <span className="font-bold text-slate-800">{stats?.averageScore || 0}%</span>
          </div>
        </div>

        {/* Card 3: Quick Stats */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Study Summary</span>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-indigo-600">{stats?.totalCourses || 0}</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">Active Courses</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-indigo-600">{stats?.totalQuizzes || 0}</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">Quizzes Taken</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>AI RAG indexing ready for instant note queries.</span>
          </div>
        </div>
      </div>

      {/* Course List Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900">Your Courses</h2>
          <span className="text-xs text-slate-500 font-semibold">{courses.length} courses total</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse h-48"></div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No courses created yet</h3>
              <p className="text-sm text-slate-500 mt-1">
                Create a course, upload your lecture PDF, and ask the AI Teacher questions.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Create First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course._id}
                to={`/course/${course._id}`}
                className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      style={{ backgroundColor: course.color || '#4F46E5' }}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                    >
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(course.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 h-10">
                    {course.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {course.docCount || 0} docs
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      {course.quizCount || 0} quizzes
                    </span>
                  </div>
                  <span className="text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCourseCreated}
      />
    </div>
  );
}
