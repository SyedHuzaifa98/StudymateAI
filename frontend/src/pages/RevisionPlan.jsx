import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Lightbulb,
  ArrowRight,
  Loader2,
  Target
} from 'lucide-react';

export default function RevisionPlan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [revision, setRevision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [courseRes, progRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/courses/${id}/progress`)
        ]);

        setCourse(courseRes.data.course);

        const topics = progRes.data.weakTopics || [];
        setWeakTopics(topics);

        const initialTopic = topics.length > 0 ? topics[0].topic : 'Key Concepts';
        setSelectedTopic(initialTopic);

        // Fetch AI revision for the initial weak topic
        generatePlanForTopic(initialTopic);
      } catch (err) {
        console.error('Failed to load initial revision data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);

  const generatePlanForTopic = async (topicName) => {
    try {
      setGenerating(true);
      setError('');
      const res = await api.post(`/courses/${id}/revision`, { topic: topicName });
      setRevision(res.data.revision);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate revision guide');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectTopic = (topicName) => {
    setSelectedTopic(topicName);
    generatePlanForTopic(topicName);
  };

  const handlePracticeTopicAgain = () => {
    // Navigate to Quiz setup pre-focused on this topic!
    navigate(`/course/${id}/quiz?topic=${encodeURIComponent(selectedTopic)}`);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <Link
          to={`/course/${id}/progress`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Progress
        </Link>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{course?.title}</span>
      </div>

      {/* Main Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl p-6 sm:p-8 border border-amber-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Adaptive Revision Plan</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Targeted AI explanations generated specifically for topics where your quiz accuracy was lowest.
            </p>
          </div>
        </div>

        <button
          onClick={handlePracticeTopicAgain}
          disabled={!selectedTopic}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <RotateCcw className="w-4 h-4" /> Practice Topic Again
        </button>
      </div>

      {/* Topic Switcher Pills */}
      {weakTopics.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Topic to Revise:
          </label>
          <div className="flex flex-wrap gap-2.5">
            {weakTopics.map((wt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectTopic(wt.topic)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedTopic === wt.topic
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>{wt.topic}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                  {wt.percentage}% accuracy
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Revision Content Card */}
      {generating ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Generating Targeted Explanation...</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Extracting foundational context from course materials for <span className="font-semibold text-slate-700">{selectedTopic}</span>...
          </p>
        </div>
      ) : revision ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">
                AI Revision Guide: <span className="text-indigo-600">{revision.topic || selectedTopic}</span>
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              Grounded in Notes
            </span>
          </div>

          {/* Core Concept Summary */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Concept Breakdown
            </h3>
            <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100/80 text-sm text-slate-800 leading-relaxed font-normal">
              <MarkdownRenderer content={revision.summary} />
            </div>
          </div>

          {/* Key Takeaways */}
          {revision.keyTakeaways && revision.keyTakeaways.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Key Principles To Remember
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {revision.keyTakeaways.map((point, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Pitfalls */}
          {revision.commonPitfalls && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">Common Pitfalls & Exam Traps:</span>
                <p className="leading-relaxed">{revision.commonPitfalls}</p>
              </div>
            </div>
          )}

          {/* Next Action Box */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-700">Ready to test your improvement?</p>
              <p className="text-xs text-slate-500">
                Close the learning loop by taking a quick 5-question test on this topic.
              </p>
            </div>
            <button
              onClick={handlePracticeTopicAgain}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-200 transition-all hover:scale-105"
            >
              Take Retest Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
