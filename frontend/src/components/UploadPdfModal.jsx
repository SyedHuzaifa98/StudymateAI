import React, { useState } from 'react';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../api/client';

export default function UploadPdfModal({ isOpen, onClose, courseId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    validateAndSetFile(selected);
  };

  const validateAndSetFile = (selected) => {
    if (!selected) return;
    if (selected.type !== 'application/pdf' && !selected.name.endsWith('.pdf')) {
      setError('Please select a valid PDF file. Images and documents in other formats are not supported in this version.');
      setFile(null);
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit. Please upload a smaller PDF note.');
      setFile(null);
      return;
    }
    setError('');
    setFile(selected);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a PDF note to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setError('');
      await api.post(`/courses/${courseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      onUploaded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Upload Course Material</h3>
              <p className="text-xs text-slate-500">PDF notes, lecture slides, or study guides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
            }`}
            onClick={() => document.getElementById('pdf-upload-input').click()}
          >
            <input
              id="pdf-upload-input"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 max-w-xs truncate">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <span className="mt-2 text-xs text-indigo-600 font-semibold underline">Click to choose another</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  <span className="text-indigo-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">Text-based PDF only (up to 25MB)</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
            <span className="font-bold">Important note:</span> Please upload readable text-based PDFs. Purely scanned images without text will be rejected.
          </div>

          <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading & Indexing...
                </>
              ) : (
                'Upload and Process'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
