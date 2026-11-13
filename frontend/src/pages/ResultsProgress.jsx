import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
  ArrowLeft,
  TrendingUp,
  Award,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function ResultsProgress() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const [courseRes, progRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/courses/${id}/progress`)
        ]);
        setCourse(courseRes.data.course);
        setProgress(progRes.data);
      } catch (err) {
        console.error('Failed to load progress:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <Link
          to={`/course/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Course
        </Link>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{course?.title}</span>
      </div>

      {/* Main Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Accuracy</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold text-slate-900">{progress?.averageScore || 0}%</span>
            <span className="text-xs text-slate-500">average across attempts</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quizzes Completed</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold text-indigo-600">{progress?.totalAttempts || 0}</span>
            <span className="text-xs text-slate-500">practice tests</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Weak Topics</span>
            <p className="text-2xl font-black text-amber-600 mt-2">
              {progress?.weakTopics?.length || 0}
            </p>
          </div>
          {progress?.weakTopics?.length > 0 && (
            <Link
              to={`/course/${id}/revision`}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-3"
            >
              Open AI Revision Plan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Topic-Wise Performance */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Topic-by-Topic Performance</h3>
            <p className="text-xs text-slate-500">Calculated directly from quiz question tags</p>
          </div>
          <Link
            to={`/course/${id}/quiz`}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            Practice Quiz
          </Link>
        </div>

        {(!progress?.topicPerformance || progress.topicPerformance.length === 0) ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No quiz attempts yet. Complete a quiz to see topic accuracy breakdown!
          </div>
        ) : (
          <div className="space-y-4">
            {progress.topicPerformance.map((tp, idx) => {
              const isWeak = tp.percentage < 70;
              return (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{tp.topic}</span>
                      {isWeak && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Needs Revision
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {tp.correct}/{tp.total} correct
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          isWeak ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {tp.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isWeak ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${tp.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quiz History */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Quiz History</h3>
        {(!progress?.recentAttempts || progress.recentAttempts.length === 0) ? (
          <p className="text-slate-400 text-sm">No quiz attempts recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {progress.recentAttempts.map((att) => (
              <div key={att._id} className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {att.quizId?.title || 'Practice Quiz'}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{new Date(att.createdAt).toLocaleDateString()}</span>
                    <span>• {att.score}/{att.totalQuestions} questions correct</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      att.percentage >= 70
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {att.percentage}% Score
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
