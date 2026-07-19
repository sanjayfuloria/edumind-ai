// src/pages/auth/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Brain, Eye, EyeOff, Loader, GraduationCap, Shield, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // login | register
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', adminCode: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const ADMIN_CODE = import.meta.env.VITE_ADMIN_REGISTRATION_CODE || 'EDUMIND_ADMIN_2024';
  const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL;
  const DEMO_STUDENT_EMAIL = import.meta.env.VITE_DEMO_STUDENT_EMAIL;
  const demoLogins = [
    {
      label: 'Try as Admin',
      icon: Shield,
      email: DEMO_ADMIN_EMAIL,
      color: '#A78BFA',
    },
    {
      label: 'Try as Student',
      icon: GraduationCap,
      email: DEMO_STUDENT_EMAIL,
      color: '#38BDF8',
    },
  ].filter(item => item.email);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const cred = await login(form.email, form.password);
        const profile = await import('../../services/database').then(m => m.getUserProfile(cred.user.uid));
        if (!profile?.role) {
          throw new Error('This account is missing a role profile. Ask the admin to set role to student or admin.');
        }
        toast.success(`Welcome back, ${cred.user.displayName}!`);
        navigate(profile?.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        if (role === 'admin' && form.adminCode !== ADMIN_CODE) {
          toast.error('Invalid admin registration code');
          setLoading(false);
          return;
        }
        await register(form.email, form.password, form.displayName, role);
        toast.success('Account created! Welcome to EduMind AI.');
        navigate(role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    }
    setLoading(false);
  }

  function handleDemoLogin({ email }) {
    setMode('login');
    setForm(f => ({ ...f, email, password: '' }));
    toast.success('Demo email selected. Enter the evaluator demo password to continue.');
  }

  function getAuthErrorMessage(err) {
    const message = err?.message || 'Unable to sign in. Please check the account and try again.';
    return message
      .replace('Firebase: ', '')
      .replace(/\(auth\/.*\)/, '')
      .trim() || 'Unable to sign in. Please check the account and try again.';
  }

  function update(key, val) { setForm(f => ({ ...f, [key]: val })); }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0D1117 0%, #1a1f2e 50%, #0f1923 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={28} color="white" />
            </div>
            <span style={{ fontSize: '28px', fontFamily: 'Space Grotesk', fontWeight: 700, color: 'white' }}>EduMind AI</span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>Intelligent Learning Platform</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'Space Grotesk', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s',
                background: mode === m ? 'rgba(99,102,241,0.8)' : 'transparent',
                color: mode === m ? 'white' : '#94A3B8',
              }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Role selector (register only) */}
          {mode === 'register' && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {[
                { value: 'student', label: 'Student', icon: GraduationCap, color: '#0EA5E9' },
                { value: 'admin', label: 'Admin', icon: Shield, color: '#7C3AED' },
              ].map(({ value, label, icon: Icon, color }) => (
                <button key={value} onClick={() => setRole(value)} style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${role === value ? color : 'rgba(255,255,255,0.1)'}`,
                  background: role === value ? `${color}20` : 'transparent',
                  color: role === value ? color : '#94A3B8', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '13px',
                }}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'register' && (
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                  <input className="input-field" placeholder="Dr. Ramesh Kumar" value={form.displayName} onChange={e => update('displayName', e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'white', paddingRight: '42px' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'register' && role === 'admin' && (
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Code</label>
                  <input className="input-field" placeholder="Enter admin registration code" value={form.adminCode} onChange={e => update('adminCode', e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: '10px',
                color: 'white', fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '15px', cursor: 'pointer', marginTop: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
              }}>
                {loading ? <><Loader size={16} className="animate-spin" /> Processing...</> : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>

          {demoLogins.length > 0 && (
            <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#A5B4FC', fontSize: '12px', fontWeight: 700, fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                <Sparkles size={14} /> Evaluator Demo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                {demoLogins.map(({ label, icon: Icon, email, color }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleDemoLogin({ email })}
                    disabled={loading}
                    style={{
                      padding: '11px 10px',
                      borderRadius: '10px',
                      border: `1.5px solid ${color}55`,
                      background: `${color}18`,
                      color,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontFamily: 'Space Grotesk',
                      fontWeight: 700,
                      fontSize: '13px',
                      opacity: loading ? 0.65 : 1,
                    }}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p style={{ color: '#475569', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
          Powered by OpenAI GPT-5.6 · Built for OpenAI Build Week 2024
        </p>
      </div>
    </div>
  );
}
