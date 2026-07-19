// src/services/openai.js
// All OpenAI API interactions go through this service

const OPENAI_API_BASE = 'https://api.openai.com/v1';

function getHeaders() {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key not configured');
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

// ─────────────────────────────────────────────────────────
// 1. AI TUTOR — Agents + Function Calling
// ─────────────────────────────────────────────────────────
export async function askTutor(question, courseContext, conversationHistory = []) {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_course_material',
        description: 'Search within the course materials to find relevant content for the student question',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            topic: { type: 'string', description: 'The topic area to search in' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'generate_practice_question',
        description: 'Generate a practice question on a specific topic to test student understanding',
        parameters: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          },
          required: ['topic', 'difficulty'],
        },
      },
    },
  ];

  const messages = [
    {
      role: 'system',
      content: `You are EduMind, an expert AI tutor for the course: "${courseContext.title}".
Course description: ${courseContext.description}
Be encouraging, clear, and pedagogically sound. Use examples relevant to Indian higher education context.
When a student asks something, first check if you need to search course materials, then provide a thorough explanation.
Always end with a follow-up question to check understanding.`,
    },
    ...conversationHistory,
    { role: 'user', content: question },
  ];

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'AI Tutor error');

  const choice = data.choices[0];

  // Handle tool calls (agentic behavior)
  if (choice.finish_reason === 'tool_calls') {
    const toolCalls = choice.message.tool_calls;
    const toolResults = toolCalls.map(tc => {
      const args = JSON.parse(tc.function.arguments);
      let result = '';
      if (tc.function.name === 'search_course_material') {
        result = `Found relevant content about "${args.query}" in the course materials. The course covers this in the context of ${courseContext.title}.`;
      } else if (tc.function.name === 'generate_practice_question') {
        result = `Practice question generated for topic: ${args.topic} at ${args.difficulty} level.`;
      }
      return { tool_call_id: tc.id, role: 'tool', content: result };
    });

    // Second pass with tool results
    const response2 = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [...messages, choice.message, ...toolResults],
        max_tokens: 1000,
      }),
    });
    const data2 = await response2.json();
    return { text: data2.choices[0].message.content, usedTools: toolCalls.map(t => t.function.name) };
  }

  return { text: choice.message.content, usedTools: [] };
}

// ─────────────────────────────────────────────────────────
// 2. STRUCTURED OUTPUTS — Quiz & Study Plan Generation
// ─────────────────────────────────────────────────────────
export async function generateQuiz(topic, numQuestions = 5, difficulty = 'medium') {
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assessment expert. Generate high-quality multiple choice questions. Always respond with valid JSON only — no markdown, no explanation.',
        },
        {
          role: 'user',
          content: `Generate ${numQuestions} multiple choice questions about "${topic}" at ${difficulty} difficulty level.
Return ONLY a JSON object with this exact structure:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "Why this is correct"
    }
  ]
}`,
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Quiz generation error');
  return JSON.parse(data.choices[0].message.content);
}

export async function generateStudyPlan(courseTitle, learnerLevel, weeksDuration = 4) {
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a curriculum design expert specializing in distance and online education. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: `Create a ${weeksDuration}-week study plan for "${courseTitle}" for a ${learnerLevel} level student.
Return ONLY JSON:
{
  "course": "${courseTitle}",
  "duration_weeks": ${weeksDuration},
  "weeks": [
    {
      "week": 1,
      "theme": "Week theme",
      "topics": ["Topic 1", "Topic 2"],
      "activities": ["Activity 1", "Activity 2"],
      "estimated_hours": 5,
      "milestone": "What student should know by end of week"
    }
  ]
}`,
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message);
  return JSON.parse(data.choices[0].message.content);
}

// ─────────────────────────────────────────────────────────
// 3. VISION — Analyze uploaded images / handwritten notes
// ─────────────────────────────────────────────────────────
export async function analyzeImage(base64Image, mimeType = 'image/jpeg', prompt = '') {
  const userPrompt = prompt || 'Analyze this educational content. Explain what you see, identify key concepts, and provide a clear explanation suitable for a university student. If this is a diagram, explain each component. If handwritten notes, transcribe and explain the content.';

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'high' },
            },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
      max_tokens: 1500,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Vision analysis error');
  return data.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────
// 4. WHISPER — Transcribe voice questions
// ─────────────────────────────────────────────────────────
export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const key = import.meta.env.VITE_OPENAI_API_KEY;
  const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}` },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Transcription error');
  return data.text;
}

// ─────────────────────────────────────────────────────────
// 5. TTS — Convert AI response to speech
// ─────────────────────────────────────────────────────────
export async function textToSpeech(text, voice = 'nova') {
  const response = await fetch(`${OPENAI_API_BASE}/audio/speech`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'tts-1',
      input: text.slice(0, 4096), // TTS limit
      voice, // alloy | echo | fable | onyx | nova | shimmer
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'TTS error');
  }

  const audioBuffer = await response.arrayBuffer();
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

// ─────────────────────────────────────────────────────────
// 6. CONTENT SUMMARIZER
// ─────────────────────────────────────────────────────────
export async function summarizeContent(text, type = 'lecture') {
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating clear, structured summaries of educational content for university students. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: `Summarize this ${type} content for a university student. Return ONLY JSON:
{
  "title": "Inferred title",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "summary": "2-3 paragraph summary",
  "key_terms": [{"term": "...", "definition": "..."}],
  "suggested_questions": ["Question 1", "Question 2"]
}

Content: ${text.slice(0, 3000)}`,
        },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message);
  return JSON.parse(data.choices[0].message.content);
}
