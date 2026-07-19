// src/pages/student/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllCourses, getStudentEnrollments, enrollStudent } from '../../services/database';
import toast from 'react-hot-toast';
import { BookOpen, Brain, Mic, Image, Trophy, TrendingUp, Play, ChevronRight, Sparkles } from 'lucide-react';

export default function StudentDashboard() {
  const { userProfile, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [allCourses, myEnrollments] = await Promise.all([
          getAllCourses(),
          getStudentEnrollments(user.uid),
        ]);
        setCourses(allCourses);
        setEnrollments(myEnrollments);
      } catch (e) { toast.error('Failed to load courses'); }
      setLoading(false);
    }
    load();
  }, [user.uid]);

  const enrolledIds = new Set(enrollments.map(e => e.courseId));
  const myProgress = enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / (enrollments.length || 1);

  async function handleEnroll(courseId) {
    try {
      await enrollStudent(user.uid, courseId);
      setEnrollments(prev => [...prev, { courseId, progress: 0 }]);
      toast.success('Enrolled successfully!');
    } catch (e) { toast.error('Enrollment failed'); }
  }

  const features = [
    { icon: Brain, label: 'AI Tutor', desc: 'Chat with your personal AI tutor', color: '#6366F1', path: '/dashboard/tutor' },
    { icon: Mic, label: 'Voice Q&A', desc: 'Ask questions with your voice', color: '#10B981', path: '/dashboard/voice' },
    { icon: Image, label: 'Image Analysis', desc: 'Upload diagrams & notes for AI explanation', color: '#F59E0B', path: '/dashboard/vision' },
    { icon: Trophy, label: 'Quiz Center', desc: 'Test your knowledge with AI-generated quizzes', color: '#EF4444', path: '/dashboard/quiz' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '28px', color: 'var(--color-ink)' }}>
            Good {getGreeting()}, {userProfile?.displayName?.split(' ')[0]}! 👋
          </h1>
          <span className="badge badge-student">Student</span>
        </div>
        <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>Your AI-powered learning journey continues here.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Enrolled Courses', value: enrollments.length, icon: BookOpen, color: '#6366F1' },
          { label: 'Avg Progress', value: `${Math.round(myProgress)}%`, icon: TrendingUp, color: '#10B981' },
          { label: 'AI Sessions', value: '—', icon: Brain, color: '#F59E0B' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', background: `${color}15`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Space Grotesk' }}>{value}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Features grid */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={18} color="#6366F1" />
          <h2 style={{ fontSize: '18px' }}>AI Learning Tools</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {features.map(({ icon: Icon, label, desc, color, path }) => (
            <button key={label} onClick={() => navigate(path)} className="card" style={{
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: 'white', transition: 'all 0.2s', padding: '20px',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '44px', height: '44px', background: `${color}15`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Icon size={22} color={color} />
              </div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Courses */}
      <div>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
          {enrollments.length > 0 ? 'My Courses' : 'Available Courses'}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <BookOpen size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: 'var(--color-muted)' }}>No courses available yet</h3>
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>Check back once your administrator adds courses.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {courses.map(course => {
              const isEnrolled = enrolledIds.has(course.id);
              const enrollment = enrollments.find(e => e.courseId === course.id);
              return (
                <div key={course.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className={`badge ${isEnrolled ? 'badge-success' : 'badge-student'}`}>
                      {isEnrolled ? '✓ Enrolled' : course.level || 'Beginner'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{course.enrolledCount || 0} students</span>
                  </div>

                  <h3 style={{ fontSize: '16px', marginBottom: '8px', lineHeight: 1.3 }}>{course.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px', flex: 1, lineHeight: 1.5 }}>
                    {course.description?.slice(0, 100)}...
                  </p>

                  {isEnrolled && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>
                        <span>Progress</span><span>{enrollment?.progress || 0}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${enrollment?.progress || 0}%`, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', borderRadius: '3px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {isEnrolled ? (
                    <button onClick={() => navigate(`/dashboard/course/${course.id}`)} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <Play size={14} /> Continue Learning
                    </button>
                  ) : (
                    <button onClick={() => handleEnroll(course.id)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                      Enroll Now <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
