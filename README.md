# 🧠 EduMind AI — Intelligent Learning Platform

> **OpenAI Build Week Hackathon 2024**  
> A full-stack, multi-modal AI education platform built with React + Firebase + OpenAI

## 🎯 What It Does

EduMind AI gives every student a personal AI tutor with four OpenAI-powered capabilities:

| Feature | OpenAI API | What It Does |
|---------|-----------|-------------|
| 🧠 AI Tutor | GPT-4o + Function Calling | Contextual Q&A with course-aware agents |
| 🎤 Voice Q&A | Whisper + TTS | Speak questions, hear answers read aloud |
| 🖼️ Image Analysis | GPT-4o Vision | Upload diagrams & notes for AI explanation |
| 📝 Quiz Center | Structured Outputs (JSON) | Auto-generate quizzes on any topic |

**Two roles:** Admins manage courses & analytics. Students learn with AI tools.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/edumind-ai.git
cd edumind-ai
npm install
```

### 2. Firebase Setup
1. Go to Firebase Console → Create project
2. Enable Authentication → Email/Password
3. Enable Firestore Database
4. Copy Web App config from Project Settings

### 3. Environment Variables
```bash
cp .env.example .env.local
# Fill in your Firebase config and OpenAI API key
```

### 4. Run Locally
```bash
npm run dev
```

### 5. Register Accounts
- **Admin:** Register with role "Admin" + code `EDUMIND_ADMIN_2024`
- **Student:** Register normally

---

## 🏗️ Architecture

```
Frontend: React 18 + Vite + Tailwind CSS
Backend: Firebase (Auth + Firestore + Hosting)
AI Layer: OpenAI (GPT-4o, Whisper, TTS, Vision)
CI/CD: GitHub Actions → Firebase Hosting
```

---

## 🚀 Deploy to Firebase

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy
```

Built for OpenAI Build Week Hackathon 2024 · IFHE Hyderabad · CDOE
