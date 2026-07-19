// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import Layout from './components/shared/Layout';

import AuthPage from './pages/auth/AuthPage';
import StudentDashboard from './pages/student/StudentDashboard';
import AITutor from './pages/student/AITutor';
import VoiceQA from './pages/student/VoiceQA';
import VisionAnalysis from './pages/student/VisionAnalysis';
import QuizCenter from './pages/student/QuizCenter';
import StudyPlan from './pages/student/StudyPlan';
import ProgressCoach from './pages/student/ProgressCoach';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  const basename = import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: '#10B981', secondary: 'white' } },
            error: { iconTheme: { primary: '#EF4444', secondary: 'white' } },
          }}
        />
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><StudentDashboard /></Layout></ProtectedRoute>} />
          <Route path="/dashboard/tutor" element={<ProtectedRoute><Layout><AITutor /></Layout></ProtectedRoute>} />
          <Route path="/dashboard/voice" element={<ProtectedRoute><Layout><VoiceQA /></Layout></ProtectedRoute>} />
          <Route path="/dashboard/vision" element={<ProtectedRoute><Layout><VisionAnalysis /></Layout></ProtectedRoute>} />
          <Route path="/dashboard/quiz" element={<ProtectedRoute><Layout><QuizCenter /></Layout></ProtectedRoute>} />
          <Route path="/dashboard/studyplan" element={<ProtectedRoute><Layout><StudyPlan /></Layout></ProtectedRoute>} />
          <Route path="/dashboard/progress" element={<ProtectedRoute><Layout><ProgressCoach /></Layout></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute requireAdmin><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
