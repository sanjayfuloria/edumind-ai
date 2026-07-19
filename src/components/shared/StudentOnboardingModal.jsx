import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Award, BookOpen, Briefcase, CheckCircle2, Clock3,
  GraduationCap, Heart, Lightbulb, Loader2, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllCourses, updateUserProfile } from '../../services/database';
import { generateOnboardingWelcome } from '../../services/openai';

const GOALS = [
  { label: 'Get a certification', description: 'Build toward a recognized credential', icon: Award, color: '#6366F1' },
  { label: 'Upskill for work', description: 'Grow practical, career-ready skills', icon: Briefcase, color: '#10B981' },
  { label: 'Academic study', description: 'Strengthen coursework and exam readiness', icon: GraduationCap, color: '#0EA5E9' },
  { label: 'Personal interest', description: 'Learn something meaningful at your pace', icon: Heart, color: '#F59E0B' },
];

export default function StudentOnboardingModal() {
  const { user, userProfile, isStudent, refreshUserProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [learningGoal, setLearningGoal] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(8);
  const [welcome, setWelcome] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const shouldShow = !dismissed && isStudent && userProfile?.onboardingComplete !== true;
  if (!shouldShow) return null;

  async function generateWelcome() {
    setStep(3);
    setGenerating(true);
    setWelcome(null);
    try {
      const courses = await getAllCourses();
      const result = await generateOnboardingWelcome(learningGoal, Number(weeklyHours), courses.map(course => course.title));
      setWelcome(result);
    } catch (error) {
      toast.error(error.message || 'Could not personalize your welcome');
    } finally {
      setGenerating(false);
    }
  }

  async function completeOnboarding() {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        onboardingComplete: true,
        learningGoal,
        weeklyHours: Number(weeklyHours),
      });
      await refreshUserProfile();
      setDismissed(true);
      toast.success('Welcome to your learning journey!');
    } catch (error) {
      toast.error(error.message || 'Could not save onboarding preferences');
    } finally {
      setSaving(false);
    }
  }

  async function skipOnboarding() {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { onboardingComplete: true });
      await refreshUserProfile();
      setDismissed(true);
      toast.success('You can personalize your learning anytime');
    } catch (error) {
      toast.error(error.message || 'Could not skip onboarding');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-overlay" role="presentation">
      <section className="onboarding-modal fade-in" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <header style={{ padding: '22px 26px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={19} color="white" />
            </div>
            <div>
              <strong style={{ display: 'block', fontFamily: 'Space Grotesk', fontSize: '15px' }}>Welcome to EduMind AI</strong>
              <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>Step {step} of 3</span>
            </div>
          </div>
          <div className="onboarding-progress" aria-label={`Onboarding step ${step} of 3`}>
            {[1, 2, 3].map(number => <span key={number} className={number <= step ? 'active' : ''} />)}
          </div>
        </header>

        <div style={{ padding: '28px 30px' }}>
          {step === 1 && (
            <div>
              <h2 id="onboarding-title" style={{ fontSize: '23px', marginBottom: '7px' }}>What brings you here?</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '22px' }}>Choose the goal that best describes your learning journey.</p>
              <div className="onboarding-goal-grid">
                {GOALS.map(({ label, description, icon: Icon, color }) => (
                  <button key={label} type="button" className={`onboarding-goal-card ${learningGoal === label ? 'selected' : ''}`} onClick={() => setLearningGoal(label)} aria-pressed={learningGoal === label}>
                    <Icon size={21} color={color} style={{ marginBottom: '10px' }} />
                    <strong style={{ display: 'block', fontFamily: 'Space Grotesk', fontSize: '14px', marginBottom: '3px' }}>{label}</strong>
                    <span style={{ color: 'var(--color-muted)', fontSize: '12px', lineHeight: 1.45 }}>{description}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-primary" disabled={!learningGoal} onClick={() => setStep(2)}>Continue</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 id="onboarding-title" style={{ fontSize: '23px', marginBottom: '7px' }}>Plan around your week</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '28px' }}>How much time can you realistically dedicate to learning?</p>
              <div style={{ padding: '25px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: 600 }}><Clock3 size={17} color="var(--color-primary)" /> Weekly study time</span>
                  <strong style={{ color: 'var(--color-primary)', fontFamily: 'Space Grotesk', fontSize: '21px' }}>{weeklyHours} hours</strong>
                </div>
                <input className="onboarding-hours-slider" type="range" min="1" max="20" step="1" value={weeklyHours} onChange={event => setWeeklyHours(Number(event.target.value))} aria-label="Weekly study hours" />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-muted)', fontSize: '11px', marginTop: '7px' }}><span>1 hour</span><span>20 hours</span></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn-primary" onClick={generateWelcome}><Sparkles size={15} /> Personalize my welcome</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              {generating ? (
                <div aria-live="polite" style={{ textAlign: 'center', padding: '34px 10px' }}>
                  <Loader2 className="spin" size={34} color="var(--color-primary)" style={{ margin: '0 auto 15px' }} />
                  <h2 id="onboarding-title" style={{ fontSize: '21px', marginBottom: '7px' }}>Creating your personalized start</h2>
                  <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>GPT-5.6 is matching your goals with the available courses...</p>
                </div>
              ) : welcome ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '15px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><CheckCircle2 size={27} color="white" /></div>
                    <h2 id="onboarding-title" style={{ fontSize: '22px', marginBottom: '8px' }}>You’re ready to begin</h2>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.65 }}>{welcome.welcome_message}</p>
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: '12px', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                      <BookOpen size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div><span style={{ display: 'block', color: 'var(--color-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommended course</span><strong style={{ fontFamily: 'Space Grotesk', fontSize: '15px' }}>{welcome.recommended_course}</strong></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <Lightbulb size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div><span style={{ display: 'block', color: 'var(--color-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your first-week tip</span><span style={{ color: 'var(--color-ink)', fontSize: '14px' }}>{welcome.first_week_tip}</span></div>
                    </div>
                  </div>
                  <button type="button" className="btn-primary" onClick={completeOnboarding} disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: '22px', padding: '13px' }}>
                    {saving ? <><Loader2 className="spin" size={16} /> Saving...</> : 'Get Started'}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '28px 10px' }}>
                  <h2 id="onboarding-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Let’s try that again</h2>
                  <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '18px' }}>We couldn’t generate your welcome yet.</p>
                  <button type="button" className="btn-primary" onClick={() => setStep(2)}>Back to preferences</button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer style={{ padding: '14px 26px', borderTop: '1px solid var(--color-border)', textAlign: 'center', background: '#FAFAFC' }}>
          <button type="button" onClick={skipOnboarding} disabled={saving || generating} style={{ border: 'none', background: 'none', color: 'var(--color-muted)', fontSize: '12px', textDecoration: 'underline', cursor: saving || generating ? 'not-allowed' : 'pointer' }}>Skip for now</button>
        </footer>
      </section>
    </div>
  );
}
