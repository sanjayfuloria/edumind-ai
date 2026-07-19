// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAnalyticsSummary, getAllUsers, getAllCourses, createCourse, deleteCourse, createAnnouncement } from '../../services/database';
import { generateStudyPlan } from '../../services/openai';
import toast from 'react-hot-toast';
import { Users, BookOpen, BarChart3, Plus, Trash2, Megaphone, Sparkles, Loader, Shield, TrendingUp, Award } from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', level: 'Beginner', duration: '4 weeks' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, c, u] = await Promise.all([
          getAnalyticsSummary(),
          getAllCourses(),
          getAllUsers('student'),
        ]);
        setStats(s);
        setCourses(c);
        setStudents(u);
      } catch (e) { toast.error('Failed to load data'); }
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreateCourse(e) {
    e.preventDefault();
    try {
      const ref = await createCourse(courseForm);
      const newCourse = { id: ref.id, ...courseForm, enrolledCount: 0 };
      setCourses(prev => [newCourse, ...prev]);
      setStats(prev => ({ ...prev, totalCourses: prev.totalCourses + 1 }));
      setShowCourseForm(false);
      setCourseForm({ title: '', description: '', level: 'Beginner', duration: '4 weeks' });
      toast.success('Course created!');
    } catch (e) { toast.error('Failed to create course'); }
  }

  async function handleDeleteCourse(id) {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    try {
      await deleteCourse(id);
      setCourses(prev => prev.filter(c => c.id !== id));
      toast.success('Course deleted');
    } catch (e) { toast.error('Delete failed'); }
  }

  async function handleAnnouncement(e) {
    e.preventDefault();
    try {
      await createAnnouncement({ ...announcementForm, createdBy: userProfile.displayName });
      setAnnouncementForm({ title: '', message: '' });
      toast.success('Announcement published!');
    } catch (e) { toast.error('Failed to publish'); }
  }

  async function generatePlan(course) {
    setLoadingPlan(course.id);
    try {
      const plan = await generateStudyPlan(course.title, course.level || 'Beginner', 4);
      const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `study-plan-${course.title.replace(/\s+/g, '-')}.json`;
      a.click();
      toast.success('Study plan generated & downloaded!');
    } catch (e) { toast.error('Plan generation failed'); }
    setLoadingPlan(null);
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <h1 style={{ fontSize: '26px' }}>Admin Dashboard</h1>
          <span className="badge badge-admin"><Shield size={10} /> Administrator</span>
        </div>
        <p style={{ color: 'var(--color-muted)' }}>Welcome, {userProfile?.displayName}. Manage your EduMind AI platform.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', background: '#F1F5F9', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'Space Grotesk', fontWeight: 500, fontSize: '13px',
            background: activeTab === id ? 'white' : 'transparent', color: activeTab === id ? 'var(--color-admin)' : 'var(--color-muted)',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
            boxShadow: activeTab === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <Loader size={32} style={{ margin: '0 auto 12px', display: 'block' }} />Loading...
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {[
                  { label: 'Total Students', value: stats?.totalStudents || 0, icon: Users, color: '#6366F1', change: '+12%' },
                  { label: 'Active Courses', value: stats?.totalCourses || 0, icon: BookOpen, color: '#10B981', change: '+2' },
                  { label: 'Enrollments', value: stats?.totalEnrollments || 0, icon: TrendingUp, color: '#F59E0B', change: '+8%' },
                  { label: 'Avg Quiz Score', value: `${stats?.avgQuizScore || 0}%`, icon: Award, color: '#EF4444', change: '+5%' },
                ].map(({ label, value, icon: Icon, color, change }) => (
                  <div key={label} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: `${color}15`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={color} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, background: '#D1FAE5', padding: '2px 8px', borderRadius: '20px' }}>{change}</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--color-ink)' }}>{value}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '2px' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Recent Students */}
              <div className="card">
                <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="var(--color-admin)" /> Recent Students
                </h3>
                {students.slice(0, 5).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #0EA5E9, #6366F1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 700 }}>
                        {s.displayName?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{s.displayName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{s.email}</div>
                      </div>
                    </div>
                    <span className="badge badge-student">Student</span>
                  </div>
                ))}
                {students.length === 0 && <p style={{ color: 'var(--color-muted)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No students yet</p>}
              </div>
            </div>
          )}

          {/* COURSES TAB */}
          {activeTab === 'courses' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px' }}>Manage Courses ({courses.length})</h2>
                <button onClick={() => setShowCourseForm(!showCourseForm)} className="btn-primary">
                  <Plus size={14} /> New Course
                </button>
              </div>

              {showCourseForm && (
                <div className="card fade-in" style={{ marginBottom: '20px', border: '1.5px solid var(--color-primary)' }}>
                  <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Create New Course</h3>
                  <form onSubmit={handleCreateCourse}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Title *</label>
                        <input className="input-field" placeholder="Strategic Management" value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} required />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</label>
                          <select className="input-field" value={courseForm.level} onChange={e => setCourseForm(f => ({ ...f, level: e.target.value }))}>
                            {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</label>
                          <input className="input-field" placeholder="4 weeks" value={courseForm.duration} onChange={e => setCourseForm(f => ({ ...f, duration: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description *</label>
                      <textarea className="input-field" placeholder="Course description for students..." rows={3} value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} required style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="btn-primary"><Plus size={14} /> Create Course</button>
                      <button type="button" onClick={() => setShowCourseForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {courses.map(course => (
                  <div key={course.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '15px' }}>{course.title}</h3>
                        <span className="badge badge-student">{course.level}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{course.duration}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{course.description?.slice(0, 100)}... · {course.enrolledCount || 0} students enrolled</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button onClick={() => generatePlan(course)} disabled={loadingPlan === course.id} style={{ padding: '8px 14px', border: '1.5px solid var(--color-primary)', borderRadius: '8px', background: 'rgba(99,102,241,0.05)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                        {loadingPlan === course.id ? <Loader size={12} /> : <Sparkles size={12} />}
                        AI Study Plan
                      </button>
                      <button onClick={() => handleDeleteCourse(course.id)} style={{ padding: '8px', border: '1.5px solid #FCA5A5', borderRadius: '8px', background: '#FFF1F2', color: '#EF4444', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <BookOpen size={40} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--color-muted)' }}>No courses yet. Create your first one!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Students ({students.length})</h2>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                      {['Student', 'Email', 'Role', 'Joined'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < students.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #0EA5E9, #6366F1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                              {s.displayName?.charAt(0) || 'S'}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{s.displayName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-muted)' }}>{s.email}</td>
                        <td style={{ padding: '14px 16px' }}><span className="badge badge-student">Student</span></td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--color-muted)' }}>
                          {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : 'Recently'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>No students registered yet</p>}
              </div>
            </div>
          )}

          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 'announcements' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Publish Announcement</h2>
              <div className="card">
                <form onSubmit={handleAnnouncement}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Announcement Title</label>
                    <input className="input-field" placeholder="Important update for all students" value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</label>
                    <textarea className="input-field" rows={4} placeholder="Write your announcement here..." value={announcementForm.message} onChange={e => setAnnouncementForm(f => ({ ...f, message: e.target.value }))} required style={{ resize: 'vertical' }} />
                  </div>
                  <button type="submit" className="btn-primary">
                    <Megaphone size={14} /> Publish to All Students
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
