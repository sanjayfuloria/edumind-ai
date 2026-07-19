// src/pages/student/VoiceQA.jsx
import { useState, useRef } from 'react';
import { transcribeAudio, askTutor, textToSpeech } from '../../services/openai';
import { getAllCourses } from '../../services/database';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Mic, MicOff, Volume2, Loader, Sparkles, BookOpen } from 'lucide-react';

export default function VoiceQA() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [history, setHistory] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    getAllCourses().then(c => { setCourses(c); if (c.length > 0) setSelectedCourse(c[0]); });
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await processAudio(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e) { toast.error('Microphone access denied'); }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function processAudio(blob) {
    if (!selectedCourse) { toast.error('Select a course first'); return; }
    setProcessing(true);
    setTranscript('');
    setAnswer('');
    try {
      const text = await transcribeAudio(blob);
      setTranscript(text);

      const { text: aiAnswer } = await askTutor(text, selectedCourse, []);
      setAnswer(aiAnswer);

      const audioUrl = await textToSpeech(aiAnswer, 'nova');
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();

      setHistory(h => [{ q: text, a: aiAnswer, time: new Date().toLocaleTimeString() }, ...h.slice(0, 4)]);
    } catch (e) {
      toast.error('Processing failed: ' + e.message);
    }
    setProcessing(false);
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #10B981, #6366F1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={20} color="white" />
          </div>
          <h1 style={{ fontSize: '24px' }}>Voice Q&A</h1>
        </div>
        <p style={{ color: 'var(--color-muted)' }}>Ask questions with your voice — powered by Whisper & GPT-5.6 with TTS response</p>
      </div>

      {/* Course selector */}
      {courses.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={16} color="var(--color-primary)" />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Course:</span>
          <select value={selectedCourse?.id || ''} onChange={e => setSelectedCourse(courses.find(c => c.id === e.target.value))}
            style={{ flex: 1, border: '1.5px solid var(--color-border)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', fontFamily: 'Inter', background: 'white' }}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}

      {/* Main mic UI */}
      <div className="card" style={{ textAlign: 'center', padding: '48px 32px', marginBottom: '24px' }}>
        <div
          onClick={recording ? stopRecording : startRecording}
          style={{
            width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 24px',
            background: recording
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : processing
                ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: recording ? '0 0 0 20px rgba(239,68,68,0.15), 0 0 0 40px rgba(239,68,68,0.08)' : '0 8px 32px rgba(99,102,241,0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          {processing ? <Loader size={48} color="white" /> : recording ? <MicOff size={48} color="white" /> : <Mic size={48} color="white" />}
        </div>

        {recording && (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '16px' }}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s`, background: '#EF4444' }} />
            ))}
          </div>
        )}

        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
          {recording ? 'Recording... Click to stop' : processing ? 'Processing your question...' : 'Click to ask a question'}
        </h3>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {recording ? 'Speak clearly. AI will transcribe & answer.' : 'Powered by OpenAI Whisper → GPT-5.6 → TTS'}
        </p>
      </div>

      {/* Transcript & Answer */}
      {(transcript || answer) && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {transcript && (
            <div className="card" style={{ borderLeft: '4px solid #0EA5E9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Mic size={14} color="#0EA5E9" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Question (Transcribed)</span>
              </div>
              <p style={{ fontSize: '15px', lineHeight: 1.6 }}>{transcript}</p>
            </div>
          )}

          {answer && (
            <div className="card" style={{ borderLeft: '4px solid #6366F1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={14} color="#6366F1" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Answer</span>
                </div>
                <button onClick={async () => { const url = await textToSpeech(answer); new Audio(url).play(); }}
                  style={{ padding: '6px 12px', border: '1.5px solid #10B981', borderRadius: '6px', background: '#D1FAE5', color: '#065F46', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                  <Volume2 size={12} /> Replay
                </button>
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{answer}</p>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--color-muted)' }}>Recent Questions</h3>
          {history.map((item, i) => (
            <div key={i} style={{ padding: '12px 16px', background: 'white', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '4px' }}>{item.time}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Q: {item.q}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>A: {item.a.slice(0, 100)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
