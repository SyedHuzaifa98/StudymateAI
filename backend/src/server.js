import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { courseQuizRouter, quizRouter } from './routes/quizRoutes.js';
import revisionRoutes from './routes/revisionRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: '*', // For development flexibility
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder for reading if needed
app.use('/uploads', express.static(path.resolve('uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/documents', documentRoutes);
app.use('/api/courses/:courseId/chat', chatRoutes);
app.use('/api/courses/:courseId/quizzes', courseQuizRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/courses/:courseId', revisionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'StudyMate AI Backend',
    timestamp: new Date().toISOString(),
    groqConfigured: Boolean(process.env.GROQ_API_KEY)
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 StudyMate AI Backend running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Groq API: ${process.env.GROQ_API_KEY ? 'Configured ✅' : 'Not set (Demo mode active) ⚠️'}`);
  console.log(`===============================================`);
});
