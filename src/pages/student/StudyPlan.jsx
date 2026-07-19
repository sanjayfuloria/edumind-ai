import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BookOpen, CalendarDays, CheckCircle2, Clock3, Download,
  Loader2, Sparkles, Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllCourses, getStudentEnrollments } from '../../services/database';
import { generateStudyPlan } from '../../services/openai';

export default function StudyPlan() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(8);
  const [plan, setPlan] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      try {
        const [allCourses, enrollments] = await Promise.all([
          getAllCourses(),
          getStudentEnrollments(user.uid),
        ]);
        if (!active) return;

        const enrolledIds = new Set(enrollments.map(enrollment => enrollment.courseId));
        const enrolledCourses = allCourses.filter(course => enrolledIds.has(course.id));
        setCourses(enrolledCourses);
        setSelectedCourseId(enrolledCourses[0]?.id || '');
      } catch {
        toast.error('Failed to load your enrolled courses');
      } finally {
        if (active) setLoadingCourses(false);
      }
    }

    loadCourses();
    return () => { active = false; };
  }, [user.uid]);

  async function handleGenerate(event) {
    event.preventDefault();
    const course = courses.find(item => item.id === selectedCourseId);
    const hours = Number(weeklyHours);

    if (!course) {
      toast.error('Select an enrolled course first');
      return;
    }
    if (!Number.isInteger(hours) || hours < 1 || hours > 40) {
      toast.error('Weekly hours must be a whole number between 1 and 40');
      return;
    }

    setGenerating(true);
    setPlan(null);
    try {
      const result = await generateStudyPlan(course, hours, getCourseWeeks(course.duration));
      setPlan(result);
      toast.success('Your smart study plan is ready');
    } catch (error) {
      toast.error(error.message || 'Could not generate a study plan');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="study-plan-page print-content" style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <header className="study-plan-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', marginBottom: '8px' }}>
            <Sparkles size={16} />
            <span style={{ fontFamily: 'Space Grotesk', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>GPT-5.6 learning planner</span>
          </div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Smart Study Plan</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>Turn your available time into a focused, week-by-week learning roadmap.</p>
        </div>
        {plan && (
          <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
            <Download size={16} /> Download
          </button>
        )}
      </header>

      <form className="card study-plan-form no-print" onSubmit={handleGenerate} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(160px, 1fr) auto', gap: '16px', alignItems: 'end', marginBottom: '28px' }}>
        <label style={{ display: 'grid', gap: '7px' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: '13px', fontWeight: 600 }}>Enrolled course</span>
          <div style={{ position: 'relative' }}>
            <BookOpen size={16} color="var(--color-muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              className="input-field"
              value={selectedCourseId}
              onChange={event => setSelectedCourseId(event.target.value)}
              disabled={loadingCourses || courses.length === 0}
              style={{ paddingLeft: '40px' }}
            >
              {loadingCourses && <option value="">Loading courses...</option>}
              {!loadingCourses && courses.length === 0 && <option value="">No enrolled courses</option>}
              {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </div>
        </label>

        <label style={{ display: 'grid', gap: '7px' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: '13px', fontWeight: 600 }}>Hours per week</span>
          <div style={{ position: 'relative' }}>
            <Clock3 size={16} color="var(--color-muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              type="number"
              min="1"
              max="40"
              step="1"
              value={weeklyHours}
              onChange={event => setWeeklyHours(event.target.value)}
              style={{ paddingLeft: '40px' }}
              required
            />
          </div>
        </label>

        <button type="submit" className="btn-primary" disabled={generating || loadingCourses || courses.length === 0} style={{ height: '43px', justifyContent: 'center' }}>
          {generating ? <><Loader2 className="spin" size={16} /> Generating</> : <><Sparkles size={16} /> Generate plan</>}
        </button>
      </form>

      {!loadingCourses && courses.length === 0 && !generating && (
        <section className="card no-print" style={{ textAlign: 'center', padding: '44px' }}>
          <BookOpen size={42} color="#CBD5E1" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Enroll in a course to get started</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Your enrolled courses will appear here automatically.</p>
        </section>
      )}

      {generating && (
        <section className="card fade-in" aria-live="polite" style={{ textAlign: 'center', padding: '52px 24px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto 16px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="spin" size={26} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>GPT-5.6 is building your roadmap</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Balancing course milestones with your {weeklyHours} available hours each week...</p>
        </section>
      )}

      {plan && !generating && (
        <section className="fade-in" aria-live="polite">
          <div className="card" style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', borderColor: '#C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <span className="badge badge-student" style={{ marginBottom: '10px' }}>{plan.total_weeks} week roadmap</span>
              <h2 style={{ fontSize: '21px', marginBottom: '6px' }}>{plan.course}</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>A focused plan designed around {plan.hours_per_week} hours per week.</p>
            </div>
            <CalendarDays size={38} color="var(--color-primary)" />
          </div>

          <div className="study-plan-timeline">
            {plan.weeks.map(week => (
              <article key={week.week} className="card study-plan-week">
                <div className="study-plan-marker">{week.week}</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
                  <div>
                    <span style={{ color: 'var(--color-primary)', fontFamily: 'Space Grotesk', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Week {week.week}</span>
                    <h3 style={{ fontSize: '18px', marginTop: '4px' }}>{week.theme}</h3>
                  </div>
                  <span className="badge badge-warning"><Clock3 size={11} /> {week.estimated_hours} hours</span>
                </div>

                <ul className="study-plan-task-list">
                  {week.daily_tasks.map((task, index) => (
                    <li key={`${week.week}-${index}`}><CheckCircle2 size={16} color="var(--color-secondary)" style={{ flexShrink: 0, marginTop: '3px' }} /><span>{task}</span></li>
                  ))}
                </ul>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '18px', padding: '13px 14px', borderRadius: '9px', background: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                  <Target size={17} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', fontFamily: 'Space Grotesk', fontSize: '12px', marginBottom: '2px' }}>Weekly milestone</strong>
                    <span style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{week.milestone}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function getCourseWeeks(duration) {
  const parsed = typeof duration === 'number' ? duration : Number.parseInt(String(duration || ''), 10);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(Math.max(Math.round(parsed), 1), 24);
}
