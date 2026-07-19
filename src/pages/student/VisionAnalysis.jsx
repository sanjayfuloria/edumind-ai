// src/pages/student/VisionAnalysis.jsx
import { useState, useRef } from 'react';
import { analyzeImage, textToSpeech } from '../../services/openai';
import toast from 'react-hot-toast';
import { Upload, Image, Loader, Volume2, Sparkles, RotateCcw, FileImage } from 'lucide-react';

const PROMPT_OPTIONS = [
  { label: 'Explain this content', value: '' },
  { label: 'Transcribe & explain handwritten notes', value: 'Transcribe these handwritten notes exactly, then provide a detailed explanation of each concept mentioned.' },
  { label: 'Analyze this diagram', value: 'Analyze this diagram in detail. Label each component, explain relationships, and describe the overall system or process shown.' },
  { label: 'Solve this problem', value: 'Help me solve this problem step by step. Show your working clearly.' },
  { label: 'Create study notes', value: 'Convert this content into structured study notes with headings, key points, and definitions.' },
];

export default function VisionAnalysis() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [analysis, setAnalysis] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(',')[1]);
      setAnalysis('');
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  async function analyze() {
    if (!imageBase64) { toast.error('Please upload an image first'); return; }
    setLoading(true);
    setAnalysis('');
    try {
      const prompt = selectedPrompt < PROMPT_OPTIONS.length - 0
        ? (PROMPT_OPTIONS[selectedPrompt].value || undefined)
        : customPrompt;
      const result = await analyzeImage(imageBase64, imageMime, prompt);
      setAnalysis(result);
    } catch (e) {
      toast.error('Analysis failed: ' + e.message);
    }
    setLoading(false);
  }

  async function speakAnalysis() {
    try {
      const url = await textToSpeech(analysis);
      new Audio(url).play();
    } catch (e) { toast.error('TTS failed'); }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #F59E0B, #EF4444)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={20} color="white" />
          </div>
          <h1 style={{ fontSize: '24px' }}>Image Analysis</h1>
        </div>
        <p style={{ color: 'var(--color-muted)' }}>Upload diagrams, handwritten notes, or textbook pages for AI-powered explanation</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: image ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Upload area */}
        <div>
          <div
            onClick={() => !image && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            style={{
              border: `2px dashed ${dragOver ? 'var(--color-primary)' : image ? 'var(--color-secondary)' : 'var(--color-border)'}`,
              borderRadius: '16px', background: dragOver ? 'rgba(99,102,241,0.05)' : image ? 'rgba(16,185,129,0.03)' : 'white',
              cursor: image ? 'default' : 'pointer', transition: 'all 0.2s', overflow: 'hidden',
              minHeight: image ? 'auto' : '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {image ? (
              <img src={image} alt="Uploaded" style={{ width: '100%', display: 'block', borderRadius: '14px' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileImage size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Drop an image here</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '16px' }}>or click to browse</p>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>JPG, PNG, GIF, WebP up to 20MB</span>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          {image && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button onClick={() => inputRef.current?.click()} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                <Upload size={14} /> Replace Image
              </button>
              <button onClick={() => { setImage(null); setImageBase64(''); setAnalysis(''); }} style={{ padding: '9px 14px', border: '1.5px solid #FCA5A5', borderRadius: '8px', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <RotateCcw size={14} /> Clear
              </button>
            </div>
          )}

          {/* Prompt selector */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PROMPT_OPTIONS.map((opt, i) => (
                <button key={i} onClick={() => setSelectedPrompt(i)} style={{
                  padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${selectedPrompt === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selectedPrompt === i ? 'rgba(99,102,241,0.08)' : 'white',
                  color: selectedPrompt === i ? 'var(--color-primary)' : 'var(--color-ink)',
                  cursor: 'pointer', fontSize: '13px', textAlign: 'left', fontWeight: selectedPrompt === i ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Or write a custom prompt..."
              value={customPrompt}
              onChange={e => { setCustomPrompt(e.target.value); setSelectedPrompt(-1); }}
              rows={2}
              style={{ marginTop: '10px', width: '100%', padding: '10px 14px', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontFamily: 'Inter', fontSize: '13px', resize: 'vertical', outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; setSelectedPrompt(-1); }}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          <button onClick={analyze} disabled={!imageBase64 || loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '13px' }}>
            {loading ? <><Loader size={16} /> Analyzing...</> : <><Sparkles size={16} /> Analyze with AI</>}
          </button>
        </div>

        {/* Analysis result */}
        {analysis && (
          <div className="fade-in">
            <div className="card" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#6366F1" />
                  <h3 style={{ fontSize: '15px' }}>AI Analysis</h3>
                </div>
                <button onClick={speakAnalysis} style={{ padding: '6px 12px', border: '1.5px solid #10B981', borderRadius: '6px', background: '#D1FAE5', color: '#065F46', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                  <Volume2 size={12} /> Listen
                </button>
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--color-ink)', whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: '600px' }}>
                {analysis}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
