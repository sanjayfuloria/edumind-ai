# 🧠 EduMind AI — Intelligent Learning Platform

> **OpenAI Build Week Hackathon 2024**  
> A full-stack, multi-modal AI education platform built with React + Firebase + OpenAI

## 🌐 Live Demo

**Production URL:** https://www.sanjayfuloria.tech/edumind-ai/

Evaluator access is available from the sign-in page:

| Role | How to test |
|------|-------------|
| Admin | Click **Try as Admin**, then enter the evaluator demo password shared in the hackathon submission notes. |
| Student | Click **Try as Student**, then enter the evaluator demo password shared in the hackathon submission notes. |

The demo buttons pre-select evaluator accounts without exposing demo passwords in the browser bundle.

## 🎯 What It Does

EduMind AI gives every student a personal AI tutor with four OpenAI-powered capabilities:

| Feature | OpenAI API | What It Does |
|---------|-----------|-------------|
| 🧠 AI Tutor | GPT-5.6 + Function Calling | Contextual Q&A with course-aware agents |
| 🎤 Voice Q&A | Whisper + TTS | Speak questions, hear answers read aloud |
| 🖼️ Image Analysis | GPT-5.6 Vision | Upload diagrams & notes for AI explanation |
| 📝 Quiz Center | Structured Outputs (JSON) | Auto-generate quizzes on any topic |
| 📅 Smart Study Plan | GPT-5.6 JSON mode | Builds week-by-week study roadmaps from enrolled courses and weekly availability |
| 📈 Progress Coach | GPT-5.6 function calling | Reads real quiz/enrollment data and returns strengths, gaps, and next action |
| ✨ Admin AI Tools | GPT-5.6 JSON mode | Summarizes source material and creates Firestore courses from AI suggestions |
| 👋 Student Onboarding | GPT-5.6 JSON mode | Personalizes welcome copy, course recommendation, and first-week tip |

**Two roles:** Admins manage courses & analytics. Students learn with AI tools.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/sanjayfuloria/edumind-ai.git
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

### 6. Optional Demo Buttons
Set demo evaluator emails in `.env.local` to show the **Try as Admin** and **Try as Student** buttons:

```bash
VITE_DEMO_ADMIN_EMAIL=demo.admin@edumind.ai
VITE_DEMO_STUDENT_EMAIL=demo.student@edumind.ai
```

Do not put demo passwords in frontend env variables. Share the password in private submission notes instead.

---

## 🏗️ Architecture

```
Frontend: React 19 + Vite + custom CSS variables (Tailwind 4 tooling)
Backend: Firebase (Auth + Firestore + Storage + Functions + Hosting)
AI Layer: OpenAI (GPT-5.6, Whisper, TTS, Vision)
Production Hosting: Hostinger VPS + Nginx under /edumind-ai/
OpenAI Security: Browser → VPS proxy → OpenAI API, so the OpenAI key is never shipped in public JS
```

---

## 🧭 Route Map

| Role | Routes |
|------|--------|
| Public | `/` |
| Student | `/dashboard`, `/dashboard/tutor`, `/dashboard/voice`, `/dashboard/vision`, `/dashboard/quiz`, `/dashboard/studyplan`, `/dashboard/progress` |
| Admin | `/admin`, `/admin/courses`, `/admin/students`, `/admin/announcements`, `/admin/aitools` |

---

## 🤖 How Codex Accelerated This Project

Codex worked as an implementation partner: it inspected the existing architecture, kept AI and Firestore operations inside their established service boundaries, implemented each accepted feature, and ran build, lint, and regression checks after every step.

**Codex Session ID:** [paste here before submission]

### Feature 1 — Model Migration to GPT-5.6

- **What Codex built:** Migrated every active Chat Completions request to `gpt-5.6`, documented the capability used at each API call, and removed stale legacy-model references from the application and documentation.
- **Developer decision:** Use the `gpt-5.6` family alias consistently across every chat/completion workflow for a clear hackathon model story.
- **Override or refinement:** The developer required a repository-wide zero-occurrence check and capability comments; Codex additionally preserved function-tool compatibility with `reasoning_effort: 'none'` on tool-enabled Chat Completions requests.
- **Engineering decision:** Standardize on one flagship chat model while retaining specialized Whisper and TTS audio endpoints.

### Feature 2 — Smart Study Plan Generator

- **What Codex built:** Added the protected study-plan route, enrolled-course selection, weekly-hours controls, validated JSON generation, a vertical timeline, and print-friendly download behavior.
- **Developer decision:** Make available weekly time—not a generic learner profile—the central planning constraint.
- **Override or refinement:** The developer supplied the exact response contract and print requirement; Codex added runtime schema validation, enrollment filtering, and course-duration-aware week counts.
- **Engineering decision:** Treat model output as untrusted data and validate it before rendering the timeline.

### Feature 3 — AI Progress Coach

- **What Codex built:** Implemented a bounded GPT-5.6 agent loop that calls `get_quiz_history` and `get_enrollment_progress`, executes real Firestore reads, returns tool results, and renders a three-part coaching report.
- **Developer decision:** Ground coaching in actual student records rather than generated or placeholder analytics.
- **Override or refinement:** The developer fixed the two tool names and three report sections; Codex forces any missing tool on a subsequent turn and validates the final report structure.
- **Engineering decision:** Require both data sources before synthesis so every recommendation is evidence-based.

### Feature 4 — Admin AI Tools

- **What Codex built:** Added an AI Tools tab that converts pasted educational content into a structured course brief and creates a Firestore course from the approved result.
- **Developer decision:** Require at least 100 characters of source material and let the admin create the suggested course in one action.
- **Override or refinement:** The developer specified the exact summary schema and post-create navigation; Codex added enum/type validation and derived a practical course duration from the estimated study hours.
- **Engineering decision:** Keep content analysis and course persistence separate until the administrator explicitly clicks the creation action.

### Feature 5 — Student Onboarding Modal

- **What Codex built:** Added a mandatory three-step student onboarding flow covering learning goals, weekly availability, and a catalog-grounded GPT-5.6 welcome and course recommendation.
- **Developer decision:** Prevent accidental dismissal while still offering an explicit preference-free skip path.
- **Override or refinement:** The developer defined the four goals and exact saved fields; Codex refreshed AuthContext after persistence so the modal stays dismissed across route changes.
- **Engineering decision:** Store only onboarding completion when students skip, preserving their choice not to provide preferences.

### Feature 6 — Documentation and Submission Traceability

- **What Codex built:** Added this feature-by-feature collaboration record and a complete model-call inventory for reviewers.
- **Developer decision:** Make the human product decisions and AI-assisted implementation work independently visible.
- **Override or refinement:** The developer required a session-ID placeholder so the final submission can be tied to the correct Codex session manually.
- **Engineering decision:** Document not only what shipped, but why each implementation boundary was chosen.

### Feature 7 — Hostinger VPS Deployment and Evaluator Access

- **What Codex built:** Prepared the Vite app for `/edumind-ai/` subpath hosting, deployed it to the Hostinger VPS, added a project card on `sanjayfuloria.tech`, and created evaluator demo-entry buttons.
- **Developer decision:** Host the project under the existing portfolio site rather than a separate hackathon-only domain.
- **Override or refinement:** The developer preferred the safer proxy deployment path; Codex replaced static browser OpenAI calls with a VPS proxy endpoint.
- **Engineering decision:** Keep Firebase config public as intended, but keep the OpenAI key server-side behind Nginx and a local Node proxy.

### Feature 8 — Production Stabilization

- **What Codex built:** Fixed admin sidebar routing with direct admin subroutes, corrected the CSS import order, hardened admin Firestore loading, and made course-count state updates null-safe.
- **Developer decision:** Keep the admin and student experiences role-separated while making evaluator testing frictionless.
- **Override or refinement:** Console/runtime issues found during live testing were patched immediately and redeployed to the VPS.
- **Engineering decision:** Prefer direct URL routes and independent Firestore loaders over fragile query-tab state and all-or-nothing dashboard reads.

---

## 🧠 Models Used

Every request to `/v1/chat/completions` uses `gpt-5.6`.

| Workflow / call | Model | Why it is used |
|-----------------|-------|----------------|
| AI Tutor — tool selection | `gpt-5.6` | Chooses when course search or practice-question tools improve the answer. |
| AI Tutor — tool-result synthesis | `gpt-5.6` | Converts tool results and conversation history into a coherent tutoring response. |
| Quiz generation | `gpt-5.6` | Produces multiple-choice assessments in validated JSON. |
| Smart Study Plan | `gpt-5.6` | Balances course scope, duration, and weekly availability into a structured roadmap. |
| Progress Coach — agent loop | `gpt-5.6` | Requests real quiz and enrollment data through function calling. |
| Progress Coach — final synthesis | `gpt-5.6` | Turns Firestore evidence into strengths, gaps, and a recommended next action. |
| Admin AI Tools | `gpt-5.6` | Converts source material into a structured, course-ready brief. |
| Student onboarding | `gpt-5.6` | Personalizes the welcome, course recommendation, and first-week tip. |
| Image analysis | `gpt-5.6` | Interprets diagrams, handwritten notes, and other educational images. |
| Educational content summarizer | `gpt-5.6` | Extracts summaries, key terms, and suggested review questions as JSON. |

Supporting non-chat audio models:

- `whisper-1` transcribes student voice questions.
- `tts-1` converts AI tutoring responses into MP3 speech.

---

## 🔐 Production OpenAI Configuration

Local development can use:

```bash
VITE_OPENAI_API_KEY=sk-...
```

The deployed VPS build does not expose that key. The Hostinger build uses:

```bash
npm run build:hostinger
```

which sets:

```bash
VITE_BASE_PATH=/edumind-ai/
VITE_OPENAI_API_BASE=/edumind-ai-api/openai/v1
VITE_OPENAI_API_KEY=
```

Nginx forwards `/edumind-ai-api/` to a local Node service. The proxy service injects `OPENAI_API_KEY` server-side and forwards only OpenAI API requests.

Deployment support files:

- `deploy/hostinger/openai-proxy/server.js`
- `deploy/hostinger/openai-proxy/edumind-openai-proxy.service`
- `deploy/hostinger/nginx-edumind-ai.conf.example`

---

## 🚀 Deploy

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy
```

### Hostinger VPS
```bash
npm run build:hostinger
rsync -av dist/ root@YOUR_VPS:/var/www/sanjayfuloria.tech/edumind-ai/
```

Install the proxy files under `/opt/edumind-openai-proxy`, add `OPENAI_API_KEY` to `/opt/edumind-openai-proxy/.env`, enable the systemd service, and add the Nginx locations from `deploy/hostinger/nginx-edumind-ai.conf.example`.

Built for OpenAI Build Week Hackathon 2024 · IFHE Hyderabad · CDOE
