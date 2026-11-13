import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import UploadPdfModal from '../components/UploadPdfModal';
import {
  ArrowLeft,
  Upload,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  BookOpen,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [error, setError] = useState('');

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseRes, docsRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/courses/${id}/documents`)
      ]);
      setCourse(courseRes.data.course);
      setDocuments(docsRes.data.documents || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();

    // Auto-poll if any document is currently in 'processing' status
    const interval = setInterval(async () => {
      const hasProcessing = documents.some(d => d.status === 'processing' || d.status === 'pending');
      if (hasProcessing) {
        try {
          const res = await api.get(`/courses/${id}/documents`);
          setDocuments(res.data.documents || []);
        } catch (e) {}
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, documents.some(d => d.status === 'processing')]);

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this PDF and its indexed memory?')) return;

    try {
      setDeletingDocId(docId);
      await api.delete(`/courses/${id}/documents/${docId}`);
      fetchCourseData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  const completedDocsCount = documents.filter(d => d.status === 'completed').length;

  if (loading && !course) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading course materials...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-100 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Course Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{error || 'This course could not be retrieved.'}</p>
        <Link to="/" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Course Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            style={{ backgroundColor: course.color || '#4F46E5' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-100"
          >
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{course.title}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              {course.description || 'No course syllabus description added.'}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4 text-indigo-500" />
                {completedDocsCount} active PDF{completedDocsCount === 1 ? '' : 's'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-400" />
                Updated {new Date(course.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: AI Teacher & Quiz */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/course/${id}/teacher`}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all ${
              completedDocsCount > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:scale-105'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI Teacher
          </Link>

          <Link
            to={`/course/${id}/quiz`}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all ${
              completedDocsCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:scale-105'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Practice Quiz
          </Link>

          <Link
            to={`/course/${id}/progress`}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Progress
          </Link>
        </div>
      </div>

      {/* Uploaded Materials & Upload trigger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Course Materials & Notes</h2>
            <p className="text-xs text-slate-500">PDFs are split into chunks & vectors for RAG questions and quiz creation</p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload PDF Notes
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No notes uploaded for this course yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Upload your lecture PDF notes or textbook slides. Once processed, you can ask the AI Teacher questions and generate practice quizzes!
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" /> Upload First PDF
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 truncate max-w-sm sm:max-w-md">
                      {doc.originalName}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                      {doc.pageCount > 0 && <span>• {doc.pageCount} pages</span>}
                      {doc.totalChunks > 0 && <span>• {doc.totalChunks} indexed chunks</span>}
                      <span>• {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  {/* Status Badge */}
                  {doc.status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Indexed & Ready
                    </span>
                  )}
                  {doc.status === 'processing' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processing Text & Embeddings...
                    </span>
                  )}
                  {doc.status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                      <Clock className="w-3.5 h-3.5" />
                      Queued
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Processing Failed
                      </span>
                      {doc.errorMessage && (
                        <span className="text-[11px] text-rose-600 max-w-xs text-right mt-1 font-medium">
                          {doc.errorMessage}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteDocument(doc._id)}
                    disabled={deletingDocId === doc._id}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete document"
                  >
                    {deletingDocId === doc._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UploadPdfModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        courseId={id}
        onUploaded={fetchCourseData}
      />
    </div>
  );
}
