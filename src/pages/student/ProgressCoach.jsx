import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight, Brain, CheckCircle2, Loader2, RefreshCw,
  Sparkles, Target, Trophy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateProgressReport } from '../../services/openai';

export default function ProgressCoach() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initialAnalysisStarted = useRef(false);
  const [report, setReport] = useState(null);
  const [hasQuizHistory, setHasQuizHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Starting your progress review...');

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setReport(null);
    setHasQuizHistory(true);
    setLoadingMessage('Starting your progress review...');

    try {
      const result = await generateProgressReport(user.uid, setLoadingMessage);
      setHasQuizHistory(result.hasQuizHistory);
      setReport(result.report);
    } catch (error) {
      toast.error(error.message || 'Could not generate your coaching report');
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    if (initialAnalysisStarted.current) return;
    initialAnalysisStarted.current = true;
    runAnalysis();
  }, [runAnalysis]);

  return (
    <main style={{ padding: '32px', maxWidth: '1050px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', marginBottom: '8px' }}>
            <Sparkles size={16} />
            <span style={{ fontFamily: 'Space Grotesk', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Data-grounded guidance</span>
          </div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>AI Progress Coach</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>Personalized coaching based on your real quiz results and course progress.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={runAnalysis} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh analysis
        </button>
      </header>

      {loading && (
        <section className="card fade-in" aria-live="polite" style={{ textAlign: 'center', padding: '58px 24px' }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '16px', margin: '0 auto 16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.14))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="spin" size={28} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '19px', marginBottom: '8px' }}>GPT-5.6 is reviewing your progress</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>{loadingMessage}</p>
          <div className="coach-loading-dots" aria-hidden="true"><span /><span /><span /></div>
        </section>
      )}

      {!loading && !hasQuizHistory && (
        <section className="card fade-in" style={{ textAlign: 'center', padding: '52px 24px' }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '16px', margin: '0 auto 16px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={28} color="#B45309" />
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Take your first quiz to unlock coaching</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 20px' }}>Your coach uses quiz performance to identify genuine strengths and learning gaps. Complete a quiz, then return for personalized guidance.</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/dashboard/quiz')}>
            Go to Quiz Center <ArrowRight size={16} />
          </button>
        </section>
      )}

      {!loading && report && (
        <section className="card coach-report-card fade-in" aria-live="polite">
          <div style={{ padding: '22px 24px', background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', borderBottom: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Brain size={21} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '19px', marginBottom: '3px' }}>Your personalized coaching report</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>Grounded in your latest Firestore learning records</p>
            </div>
          </div>

          <div className="coach-report-grid">
            <ReportSection title="Strengths" icon={<CheckCircle2 size={19} color="#059669" />} tone="#ECFDF5">
              <ul className="coach-report-list">
                {report.strengths.map((strength, index) => (
                  <li key={index}><CheckCircle2 size={15} color="#10B981" style={{ flexShrink: 0, marginTop: '3px' }} /><span>{strength}</span></li>
                ))}
              </ul>
            </ReportSection>

            <ReportSection title="Gaps to Address" icon={<Target size={19} color="#D97706" />} tone="#FFFBEB">
              <ul className="coach-report-list">
                {report.gaps_to_address.map((gap, index) => (
                  <li key={index}><Target size={15} color="#F59E0B" style={{ flexShrink: 0, marginTop: '3px' }} /><span>{gap}</span></li>
                ))}
              </ul>
            </ReportSection>

            <ReportSection title="Recommended Next Action" icon={<ArrowRight size={19} color="#4F46E5" />} tone="#EEF2FF">
              <p style={{ color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.65, marginTop: '15px' }}>{report.recommended_next_action}</p>
              <button type="button" className="btn-primary" onClick={() => navigate('/dashboard/studyplan')} style={{ marginTop: '18px' }}>
                Build a study plan <ArrowRight size={15} />
              </button>
            </ReportSection>
          </div>
        </section>
      )}
    </main>
  );
}

function ReportSection({ title, icon, tone, children }) {
  return (
    <article className="coach-report-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <h3 style={{ fontSize: '15px' }}>{title}</h3>
      </div>
      {children}
    </article>
  );
}
