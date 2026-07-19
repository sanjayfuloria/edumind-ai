// src/components/shared/Layout.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Brain, LayoutDashboard, BookOpen, Mic, Image, Trophy, LogOut,
  Shield, Users, BarChart3, Megaphone, Sparkles, Settings, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const STUDENT_NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/tutor', label: 'AI Tutor', icon: Brain },
  { path: '/dashboard/voice', label: 'Voice Q&A', icon: Mic },
  { path: '/dashboard/vision', label: 'Image Analysis', icon: Image },
  { path: '/dashboard/quiz', label: 'Quiz Center', icon: Trophy },
];

const ADMIN_NAV = [
  { path: '/admin', label: 'Overview', icon: BarChart3 },
  { path: '/admin?tab=courses', label: 'Courses', icon: BookOpen },
  { path: '/admin?tab=students', label: 'Students', icon: Users },
  { path: '/admin?tab=announcements', label: 'Announcements', icon: Megaphone },
];

export default function Layout({ children }) {
  const { userProfile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleLogout() {
    await logout();
    toast.success('Signed out');
    navigate('/');
  }

  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-surface)' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '240px' : '64px', minHeight: '100vh', background: 'white',
        borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Brain size={20} color="white" />
          </div>
          {sidebarOpen && <span style={{ fontSize: '16px', fontFamily: 'Space Grotesk', fontWeight: 700 }}>EduMind AI</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* User info */}
        {sidebarOpen && (
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isAdmin ? 'linear-gradient(135deg, #7C3AED, #6366F1)' : 'linear-gradient(135deg, #0EA5E9, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                {userProfile?.displayName?.charAt(0) || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userProfile?.displayName}</div>
                <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-student'}`} style={{ marginTop: '2px', fontSize: '10px' }}>
                  {isAdmin ? <><Shield size={8} /> Admin</> : <><Sparkles size={8} /> Student</>}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {nav.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path.split('?')[0] && (path === location.pathname || path.includes('?'));
            const exactActive = location.pathname === path.split('?')[0];
            return (
              <button key={path} onClick={() => navigate(path.split('?')[0])} className={`sidebar-link ${exactActive ? 'active' : ''}`} title={!sidebarOpen ? label : ''}>
                <Icon size={18} />
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={handleLogout} className="sidebar-link" style={{ color: '#EF4444', width: '100%' }} title={!sidebarOpen ? 'Sign Out' : ''}>
            <LogOut size={18} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
