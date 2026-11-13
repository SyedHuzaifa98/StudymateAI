import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  BookOpen,
  AlertCircle,
  Award
} from 'lucide-react';

export default function QuizPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const focusTopicParam = searchParams.get('topic');

  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [focusTopic, setFocusTopic] = useState(focusTopicParam || '');

  const [quizState, setQuizState] = useState('setup'); // 'setup', 'generating', 'taking', 'submitted'
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionIndex]: optionText }
  const [submittedAttempt, setSubmittedAttempt] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data.course);
      } catch (err) {
        console.error('Failed to load course:', err);
      }
    };
    fetchCourse();
  }, [id]);

  // If focusTopic was passed in URL query param, automatically update
  useEffect(() => {
    if (focusTopicParam) {
      setFocusTopic(focusTopicParam);
    }
  }, [focusTopicParam]);

  const handleStartQuiz = async () => {
    try {
      setQuizState('generating');
      setError('');
      const res = await api.post(`/courses/${id}/quizzes`, {
        difficulty,
        count: questionCount,
        focusTopic: focusTopic.trim() || undefined
      });

      setCurrentQuiz(res.data.quiz);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setQuizState('taking');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate quiz');
      setQuizState('setup');
    }
  };

  const handleSelectOption = (option) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: option
    });
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz) return;

    try {
      setSubmitting(true);
      setError('');

      // Format answers for server scoring
      const answersPayload = currentQuiz.questions.map((q, idx) => ({
        questionId: q._id,
        questionIndex: idx,
        selectedAnswer: selectedAnswers[idx] || ''
      }));

      const res = await api.post(`/quizzes/${currentQuiz._id}/attempts`, {
        answers: answersPayload
      });

      setSubmittedAttempt(res.data.attempt);
      setQuizState('submitted');

      // Trigger celebratory confetti if score >= 70%
      if (res.data.attempt.percentage >= 70) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <Link
          to={`/course/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Course
        </Link>
        <div className="text-right">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{course?.title || 'Course'}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. SETUP STATE */}
      {quizState === 'setup' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Configure Practice Quiz</h2>
              <p className="text-sm text-slate-500">
                AI will generate questions directly grounded in your uploaded notes.
              </p>
            </div>
          </div>

          <div className="space-y-5 pt-2">
            {/* Focus Topic (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Focus on Specific Topic (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Memory Management, Photosynthesis, Fiscal Policy..."
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900"
              />
              <p className="text-xs text-slate-400 mt-1">Leave blank to generate a comprehensive test across all notes.</p>
            </div>

            {/* Difficulty selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'easy', label: 'Easy', desc: 'Direct recall & key definitions' },
                  { id: 'medium', label: 'Medium', desc: 'Application & core concepts' },
                  { id: 'hard', label: 'Hard', desc: 'Critical analysis & deep concepts' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      difficulty === d.id
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <p className="font-bold text-sm text-slate-900">{d.label}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Number of Questions
              </label>
              <div className="flex gap-3">
                {[3, 5, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm border transition-all ${
                      questionCount === num
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    {num} Questions
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleStartQuiz}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Generate Quiz with AI
            </button>
          </div>
        </div>
      )}

      {/* 2. GENERATING STATE */}
      {quizState === 'generating' && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Synthesizing Course Questions...</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Groq is analyzing your uploaded notes, extracting key principles, and formatting multiple-choice options with explanations.
          </p>
        </div>
      )}

      {/* 3. TAKING STATE */}
      {quizState === 'taking' && currentQuiz && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          {/* Stepper / Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>
                Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}
              </span>
              <span className="text-indigo-600">
                {currentQuiz.questions[currentQuestionIndex].topic}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Current Question */}
          <div className="space-y-4 pt-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {currentQuiz.questions[currentQuestionIndex].question}
            </h3>

            {/* Options */}
            <div className="space-y-3 pt-2">
              {currentQuiz.questions[currentQuestionIndex].options.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === option;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold ring-2 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-800 bg-slate-50/30'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-sm">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentQuestionIndex < currentQuiz.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-200"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scoring...
                  </>
                ) : (
                  'Submit & Check Score'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. SUBMITTED / RESULTS REVIEW STATE */}
      {quizState === 'submitted' && submittedAttempt && (
        <div className="space-y-6">
          {/* Score Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${
                  submittedAttempt.percentage >= 70
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {submittedAttempt.percentage}%
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {submittedAttempt.percentage >= 70 ? 'Great Job!' : 'Keep Practicing!'}
                </h3>
                <p className="text-sm text-slate-500">
                  You answered {submittedAttempt.score} out of {submittedAttempt.totalQuestions} questions correctly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuizState('setup')}
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Take Another
              </button>
              <Link
                to={`/course/${id}/revision`}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Revise Weak Topics
              </Link>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-slate-900">Question-by-Question Review</h4>
            {submittedAttempt.answers.map((ans, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border bg-white ${
                  ans.isCorrect ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Question {idx + 1} • <span className="text-indigo-600">{ans.topic}</span>
                  </span>
                  {ans.isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-slate-900 mb-3">{ans.questionText}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      ans.isCorrect
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span className="font-bold block mb-0.5 text-slate-500">Your Answer:</span>
                    {ans.selectedAnswer || '(No answer provided)'}
                  </div>
                  {!ans.isCorrect && (
                    <div className="p-2.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold">
                      <span className="font-bold block mb-0.5 text-emerald-700">Correct Answer:</span>
                      {ans.correctAnswer}
                    </div>
                  )}
                </div>

                {ans.explanation && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-100">
                    <span className="font-bold text-slate-700">Explanation: </span>
                    {ans.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
