# StudyMate AI 🎓 — Minimal AI Study Assistant

> A complete AI-powered study assistant built strictly following the **StudyMate AI Roadmap**. It solves a focused student problem: upload notes, ask grounded questions, practice quizzes, and discover & revise weak topics.

---

## 🌟 The Complete Learning Loop
1. **Upload Course Notes:** Upload lecture slides or PDF notes. Text is extracted, chunked, and vector embeddings are stored in local MongoDB.
2. **Ask AI Teacher:** RAG-grounded conversational tutor that cites specific files and page numbers (e.g. `[Biology_Notes.pdf - Page 4]`), and honestly reports when answers aren't in the material.
3. **Take Course Quiz:** Configurable MCQs generated from notes with server-side validation and scoring.
4. **Identify Weak Topics:** Calculates topic-by-topic accuracy from quiz attempts and highlights topics needing revision.
5. **Targeted Revision & Retest:** Generates an AI revision guide for weak topics and provides a 1-click button to take a targeted retest.

---

## 🛠️ Technology Stack
- **Frontend:** React + Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend:** Node.js + Express (RESTful API, Multer, bcryptjs, JWT)
- **Database:** Local MongoDB Community Server via Mongoose
- **Embeddings & Vector Search:** Local HuggingFace/ONNX pipeline (`Xenova/all-MiniLM-L6-v2`) with in-memory cosine similarity retrieval
- **LLM:** Groq API (`llama-3.3-70b-versatile` or `llama-3.1-8b-instant`)

---

## 📱 The 6 Main Screens
- **Screen 1 — Dashboard (`/`):** List of courses, "Create Course" modal, recent study activity, last quiz score card, and weak topic revision reminders.
- **Screen 2 — Course & Materials (`/course/:id`):** Syllabus description, PDF upload with real-time status badges (Queued, Processing, Completed, Failed), page counts, and quick actions.
- **Screen 3 — AI Teacher (`/course/:id/teacher`):** Grounded Q&A chat with document citation pills, suggested follow-up questions, and honest fallbacks.
- **Screen 4 — Quiz Setup & Quiz (`/course/:id/quiz`):** Difficulty selector, question count (3, 5, 8, 10), topic focus, interactive MCQ cards with server-scored instant feedback.
- **Screen 5 — Results & Progress (`/course/:id/progress`):** Topic-by-topic accuracy bars, overall score history, and list of attempts.
- **Screen 6 — Revision Plan (`/course/:id/revision`):** Highlighted weak topics, AI concept breakdown, key takeaways, common exam traps, and 1-click **"Practice Topic Again"** retest button.

---

## 🚀 Running the Project Locally

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** running locally on default port `27017` (e.g. `mongodb://127.0.0.1:27017/studymate_ai`)

### 2. Configure Environment Variables
In `backend/.env`:
```env
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/studymate_ai
JWT_SECRET=your_secret_key_here
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
CLIENT_URL=http://localhost:5173
```
*(Note: If `GROQ_API_KEY` is not provided, the backend operates in a friendly Demo Mode for testing).*

### 3. Start Backend
```bash
cd backend
npm run dev
# Server runs on http://localhost:8000
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 🔐 1-Click Demo Login
On the login screen, click **"1-Click Demo Login"** to instantly test the platform with a pre-configured demo account!
