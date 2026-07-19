// src/pages/student/AITutor.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { askTutor, transcribeAudio, textToSpeech } from '../../services/openai';
import { saveChatMessage, getChatHistory, getAllCourses } from '../../services/database';
import toast from 'react-hot-toast';
import { Send, Mic, MicOff, Volume2, VolumeX, Brain, Loader, Wrench, BookOpen } from 'lucide-react';

export default function AITutor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);
  const currentAudioRef = useRef(null);

  useEffect(() => {
    getAllCourses().then(c => {
      setCourses(c);
      if (c.length > 0) setSelectedCourse(c[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedCourse && user) {
      getChatHistory(user.uid, selectedCourse.id).then(history => {
        setMessages(history.map(h => ({ role: h.role, content: h.content })));
      });
    }
  }, [selectedCourse, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(text) {
    if (!text.trim() || !selectedCourse) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    await saveChatMessage(user.uid, selectedCourse.id, 'user', text);

    try {
      const conversationHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { text: aiText, usedTools } = await askTutor(text, selectedCourse, conversationHistory);

      const assistantMsg = { role: 'assistant', content: aiText, tools: usedTools };
      setMessages(prev => [...prev, assistantMsg]);
      await saveChatMessage(user.uid, selectedCourse.id, 'assistant', aiText);

      if (ttsEnabled && aiText) {
        playTTS(aiText);
      }
    } catch (err) {
      toast.error('AI Tutor is unavailable: ' + err.message);
    }
    setLoading(false);
  }

  async function playTTS(text) {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        URL.revokeObjectURL(currentAudioRef.current.src);
      }
      setAudioPlaying(true);
      const url = await textToSpeech(text, 'nova');
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => { setAudioPlaying(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch (e) { setAudioPlaying(false); }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          toast.loading('Transcribing...', { id: 'transcribe' });
          const transcript = await transcribeAudio(blob);
          toast.dismiss('transcribe');
          if (transcript) { setInput(transcript); toast.success('Voice captured!'); }
        } catch (e) { toast.dismiss('transcribe'); toast.error('Transcription failed'); }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', margin: 0 }}>AI Tutor</h2>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>Powered by GPT-5.6 with function calling</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {courses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={14} color="var(--color-muted)" />
              <select value={selectedCourse?.id || ''} onChange={e => setSelectedCourse(courses.find(c => c.id === e.target.value))}
                style={{ border: '1.5px solid var(--color-border)', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontFamily: 'Inter', background: 'white', cursor: 'pointer' }}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}
          <button onClick={() => setTtsEnabled(!ttsEnabled)} style={{
            padding: '8px 14px', borderRadius: '8px', border: `1.5px solid ${ttsEnabled ? '#10B981' : 'var(--color-border)'}`,
            background: ttsEnabled ? '#D1FAE5' : 'white', color: ttsEnabled ? '#065F46' : 'var(--color-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500,
          }}>
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {ttsEnabled ? 'Voice On' : 'Voice Off'}
            {audioPlaying && <span className="pulse-dot" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-surface)' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Brain size={32} color="white" />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Your AI Tutor is ready</h3>
            <p style={{ color: 'var(--color-muted)', marginBottom: '24px' }}>Ask anything about your course — type or use your voice</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {['Explain the key concepts', 'Give me a practice question', 'Summarize the main ideas', 'What are common mistakes?'].map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding: '8px 16px', borderRadius: '20px', border: '1.5px solid var(--color-border)',
                  background: 'white', fontSize: '13px', cursor: 'pointer', color: 'var(--color-ink)',
                  fontFamily: 'Inter', transition: 'all 0.15s',
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="fade-in" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #0EA5E9, #6366F1)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontWeight: 700, fontFamily: 'Space Grotesk',
            }}>
              {msg.role === 'user' ? '👤' : '🧠'}
            </div>
            <div style={{ maxWidth: '72%' }}>
              {msg.tools?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Wrench size={11} color="#6366F1" />
                  <span style={{ fontSize: '11px', color: '#6366F1', fontWeight: 600 }}>Used: {msg.tools.join(', ')}</span>
                </div>
              )}
              <div style={{
                padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'white',
                color: msg.role === 'user' ? 'white' : 'var(--color-ink)',
                fontSize: '14px', lineHeight: 1.6, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && (
                <button onClick={() => playTTS(msg.content)} style={{ marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 4px' }}>
                  <Volume2 size={11} /> Listen
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="fade-in" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🧠</div>
            <div style={{ padding: '14px 18px', background: 'white', borderRadius: '4px 16px 16px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '8px' }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: 'white' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={selectedCourse ? `Ask about ${selectedCourse.title}...` : 'Select a course first'}
            disabled={!selectedCourse || loading}
            rows={1}
            style={{
              flex: 1, padding: '12px 16px', border: '1.5px solid var(--color-border)', borderRadius: '12px',
              fontFamily: 'Inter', fontSize: '14px', resize: 'none', outline: 'none', lineHeight: 1.5,
              transition: 'border-color 0.2s', maxHeight: '120px',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
          <button
            onClick={recording ? stopRecording : startRecording}
            style={{
              width: '44px', height: '44px', borderRadius: '10px', border: `2px solid ${recording ? '#EF4444' : 'var(--color-border)'}`,
              background: recording ? '#FEE2E2' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.2s',
            }}
            title={recording ? 'Stop recording' : 'Record voice question'}
          >
            {recording ? <MicOff size={18} color="#EF4444" /> : <Mic size={18} color="var(--color-muted)" />}
          </button>
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || !selectedCourse} className="btn-primary" style={{ height: '44px', padding: '0 20px', flexShrink: 0 }}>
            {loading ? <Loader size={16} /> : <Send size={16} />}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '8px' }}>Press Enter to send · Shift+Enter for new line · Click mic for voice input</p>
      </div>
    </div>
  );
}
