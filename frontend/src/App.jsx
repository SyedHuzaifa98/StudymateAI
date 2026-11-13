import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseDetail from './pages/CourseDetail';
import AiTeacher from './pages/AiTeacher';
import QuizPage from './pages/QuizPage';
import ResultsProgress from './pages/ResultsProgress';
import RevisionPlan from './pages/RevisionPlan';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/course/:id" element={<CourseDetail />} />
                <Route path="/course/:id/teacher" element={<AiTeacher />} />
                <Route path="/course/:id/quiz" element={<QuizPage />} />
                <Route path="/course/:id/progress" element={<ResultsProgress />} />
                <Route path="/course/:id/revision" element={<RevisionPlan />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
