// src/pages/student/QuizCenter.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { generateQuiz } from '../../services/openai';
import { saveQuizResult } from '../../services/database';
import toast from 'react-hot-toast';
import { Trophy, Loader, CheckCircle, XCircle, RefreshCw, Sparkles, BookOpen, Target } from 'lucide-react';

export default function QuizCenter() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [numQ, setNumQ] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  async function createQuiz() {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setLoading(true);
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);
    try {
      const result = await generateQuiz(topic, numQ, difficulty);
      setQuiz(result);
      toast.success(`${result.questions.length} questions generated!`);
    } catch (e) {
      toast.error('Quiz generation failed: ' + e.message);
    }
    setLoading(false);
  }

  async function submitQuiz() {
    const correct = quiz.questions.filter(q => answers[q.id] === q.correct_answer).length;
    const pct = Math.round((correct / quiz.questions.length) * 100);
    setScore(pct);
    setSubmitted(true);

    try {
      await saveQuizResult(user.uid, quiz.topic, {
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        score: pct,
        totalQuestions: quiz.questions.length,
        correctAnswers: correct,
        answers,
      });
    } catch (e) { /* non-blocking */ }
  }

  const difficultyColors = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' };

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #EF4444, #F59E0B)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={20} color="white" />
          </div>
          <h1 style={{ fontSize: '24px' }}>Quiz Center</h1>
        </div>
        <p style={{ color: 'var(--color-muted)' }}>AI generates custom quizzes on any topic instantly</p>
      </div>

      {/* Generator */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#6366F1" /> Generate a Quiz
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topic</label>
            <input className="input-field" placeholder="e.g. Supply Chain Management, Porter's Five Forces..." value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && createQuiz()} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Questions</label>
            <select value={numQ} onChange={e => setNumQ(+e.target.value)} className="input-field" style={{ width: '80px' }}>
              {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input-field" style={{ width: '100px' }}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        <button onClick={createQuiz} disabled={loading || !topic.trim()} className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }}>
          {loading ? <><Loader size={14} /> Generating Quiz...</> : <><Sparkles size={14} /> Generate Quiz</>}
        </button>
      </div>

      {/* Score result */}
      {submitted && (
        <div className="fade-in card" style={{ marginBottom: '24px', background: score >= 70 ? '#F0FDF4' : '#FFF7ED', border: `1.5px solid ${score >= 70 ? '#86EFAC' : '#FCD34D'}`, textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '56px', fontWeight: 800, fontFamily: 'Space Grotesk', color: score >= 70 ? '#166534' : '#92400E' }}>{score}%</div>
          <div style={{ fontSize: '18px', color: score >= 70 ? '#15803D' : '#B45309', fontWeight: 600, marginBottom: '8px' }}>
            {score >= 90 ? '🏆 Excellent!' : score >= 70 ? '✅ Well done!' : score >= 50 ? '📚 Keep studying' : '💪 Keep at it!'}
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
            {quiz.questions.filter(q => answers[q.id] === q.correct_answer).length} of {quiz.questions.length} correct
          </p>
          <button onClick={() => { setQuiz(null); setAnswers({}); setSubmitted(false); }} className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }}>
            <RefreshCw size={14} /> Try Another Quiz
          </button>
        </div>
      )}

      {/* Questions */}
      {quiz && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px' }}>{quiz.topic}</h2>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span className="badge" style={{ background: `${difficultyColors[quiz.difficulty]}20`, color: difficultyColors[quiz.difficulty] }}>
                  <Target size={10} /> {quiz.difficulty}
                </span>
                <span className="badge badge-student"><BookOpen size={10} /> {quiz.questions.length} questions</span>
              </div>
            </div>
            {!submitted && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{Object.keys(answers).length}/{quiz.questions.length} answered</div>
                <div style={{ height: '4px', width: '120px', background: '#E2E8F0', borderRadius: '2px', marginTop: '4px' }}>
                  <div style={{ height: '100%', width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%`, background: 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {quiz.questions.map((q, qi) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correct_answer;
              return (
                <div key={q.id} className="card" style={{ borderColor: submitted ? (isCorrect ? '#86EFAC' : userAns ? '#FCA5A5' : 'var(--color-border)') : 'var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                    <span style={{ width: '26px', height: '26px', background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>{qi + 1}</span>
                    <p style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.4 }}>{q.question}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map(opt => {
                      const letter = opt.charAt(0);
                      const isSelected = userAns === letter;
                      const isRight = letter === q.correct_answer;
                      let bg = 'white', border = 'var(--color-border)', color = 'var(--color-ink)';
                      if (submitted) {
                        if (isRight) { bg = '#F0FDF4'; border = '#86EFAC'; color = '#166534'; }
                        else if (isSelected && !isRight) { bg = '#FFF1F2'; border = '#FCA5A5'; color = '#BE123C'; }
                      } else if (isSelected) {
                        bg = 'rgba(99,102,241,0.08)'; border = 'var(--color-primary)'; color = 'var(--color-primary)';
                      }
                      return (
                        <button key={opt} disabled={submitted} onClick={() => setAnswers(a => ({ ...a, [q.id]: letter }))} style={{
                          padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${border}`, background: bg, color,
                          cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: '14px', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                          {submitted && isRight && <CheckCircle size={14} color="#16A34A" />}
                          {submitted && isSelected && !isRight && <XCircle size={14} color="#DC2626" />}
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                      <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted && (
            <button onClick={submitQuiz} disabled={Object.keys(answers).length < quiz.questions.length} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '14px', fontSize: '15px' }}>
              <Trophy size={16} /> Submit Quiz ({Object.keys(answers).length}/{quiz.questions.length} answered)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
