import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  ArrowLeft,
  Send,
  Sparkles,
  BookOpen,
  FileText,
  AlertCircle,
  HelpCircle,
  Bot,
  User,
  Loader2,
  Bookmark,
  Copy,
  Check
} from 'lucide-react';

export default function AiTeacher() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data.course);

        // Initial welcome message from AI Teacher
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I am your AI Teacher for **${res.data.course.title}**.\n\nAsk me any question about your course notes, and I'll explain concepts using the exact material and citations from your uploaded PDFs.`,
            sources: [],
            suggestedQuestions: [
              'What are the core concepts covered in these notes?',
              'Explain the most important definitions.',
              'Give me a summary of key takeaways.'
            ]
          }
        ]);
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (questionText) => {
    const query = questionText || input;
    if (!query || query.trim() === '' || loading) return;

    const userMessage = {
      role: 'user',
      content: query.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post(`/courses/${id}/chat`, { question: query });
      const aiMessage = {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources || [],
        suggestedQuestions: res.data.suggestedQuestions || []
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${err.response?.data?.message || err.message || 'Unable to retrieve answer from AI.'}`,
        isError: true,
        sources: [],
        suggestedQuestions: []
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  if (initialLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to={`/course/${id}`}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">AI Teacher</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                RAG Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500">{course?.title || 'Course'}</p>
          </div>
        </div>

        <Link
          to={`/course/${id}/quiz`}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          Take Quiz Instead
        </Link>
      </div>

      {/* Chat Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 sm:gap-4 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-indigo-200">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl sm:max-w-3xl ${msg.role === 'user' ? 'order-1' : 'order-2'} w-full`}>
              <div
                className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100'
                    : msg.isError
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-none'
                    : 'bg-white text-slate-800 border border-slate-200/90 shadow-sm rounded-bl-none'
                }`}
              >
                {/* Assistant Header with Copy Button */}
                {msg.role === 'assistant' && !msg.isError && (
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 text-xs text-slate-400">
                    <span className="font-semibold text-indigo-600 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> StudyMate AI Teacher
                    </span>
                    <button
                      onClick={() => handleCopyMessage(msg.content, index)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors px-2 py-0.5 rounded-lg hover:bg-slate-100"
                      title="Copy response"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px] font-semibold text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {msg.role === 'assistant' && !msg.isError ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap font-normal">{msg.content}</div>
                )}

                {/* Grounded Citation Chips */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Bookmark className="w-3.5 h-3.5 text-indigo-500" /> Grounded In Citations:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          title={src.preview}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-800 text-xs font-semibold"
                        >
                          <FileText className="w-3 h-3 text-indigo-600" />
                          <span className="truncate max-w-[150px]">{src.documentName}</span>
                          <span className="text-indigo-500 font-bold">p.{src.pageNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested Follow-up Questions */}
              {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="mt-2.5 pl-1 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-400">Suggested follow-ups:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedQuestions.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSendMessage(q)}
                        disabled={loading}
                        className="text-left text-xs text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-xl transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 sm:gap-4 items-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-2.5 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>Retrieving relevant course chunks & synthesizing grounded answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="shrink-0 pt-3 border-t border-slate-200">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask a question about your uploaded notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="w-full pl-4 pr-14 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 bg-white shadow-sm transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center mt-2">
          StudyMate AI only answers from your notes and reports when content is not found.
        </p>
      </form>
    </div>
  );
}
