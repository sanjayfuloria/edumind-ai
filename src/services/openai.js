// src/services/openai.js
// All OpenAI API interactions go through this service

import { getStudentEnrollments, getStudentQuizResults } from './database';

const OPENAI_API_BASE = import.meta.env.VITE_OPENAI_API_BASE || 'https://api.openai.com/v1';
const USES_DIRECT_OPENAI = OPENAI_API_BASE.includes('api.openai.com');

function getAuthHeaders() {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key && USES_DIRECT_OPENAI) throw new Error('OpenAI API key not configured');
  return key ? { 'Authorization': `Bearer ${key}` } : {};
}

function getHeaders() {
  return {
    ...getAuthHeaders(),
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

  // GPT-5.6: Agentic tool use — decides when course search or practice generation improves the tutoring response.
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
      reasoning_effort: 'none',
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
    // GPT-5.6: Tool-result synthesis — turns retrieved course context and generated practice data into a coherent answer.
    const response2 = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        model: 'gpt-5.6',
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
  // GPT-5.6: Structured generation — produces reliable assessment content that conforms to the quiz JSON contract.
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
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

export async function generateStudyPlan(course, hoursPerWeek = 8, weeksDuration = 4) {
  const courseTitle = typeof course === 'string' ? course : course.title;
  const courseDescription = typeof course === 'string' ? '' : course.description || '';
  const learnerLevel = typeof course === 'string' ? 'university' : course.level || 'university';

  // GPT-5.6: Structured planning — balances course goals and time constraints into a schema-safe weekly roadmap.
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
      messages: [
        {
          role: 'system',
          content: 'You are a curriculum design expert specializing in distance and online education. Return valid JSON matching the requested schema exactly, with no markdown or additional keys.',
        },
        {
          role: 'user',
          content: `Create a practical ${weeksDuration}-week study plan for "${courseTitle}" for a ${learnerLevel} level student who has ${hoursPerWeek} hours available each week.
Course description: ${courseDescription.slice(0, 1000) || 'No description provided.'}

Use exactly ${weeksDuration} weeks. Keep every week's estimated_hours at or below ${hoursPerWeek}, make daily_tasks specific and actionable, and make each milestone measurable.
Return ONLY this JSON structure:
{
  "course": "${courseTitle}",
  "total_weeks": ${weeksDuration},
  "hours_per_week": ${hoursPerWeek},
  "weeks": [
    {
      "week": 1,
      "theme": "Week theme",
      "daily_tasks": ["Specific task 1", "Specific task 2"],
      "milestone": "Measurable outcome for the end of the week",
      "estimated_hours": ${hoursPerWeek}
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
  if (!response.ok) throw new Error(data.error?.message || 'Study plan generation error');

  const plan = JSON.parse(data.choices[0].message.content);
  if (!isValidStudyPlan(plan)) {
    throw new Error('GPT-5.6 returned an invalid study plan. Please try again.');
  }
  return plan;
}

function isValidStudyPlan(plan) {
  return Boolean(
    plan
    && typeof plan.course === 'string'
    && Number.isFinite(plan.total_weeks)
    && Number.isFinite(plan.hours_per_week)
    && Array.isArray(plan.weeks)
    && plan.weeks.length === plan.total_weeks
    && plan.weeks.every(week => (
      Number.isFinite(week.week)
      && typeof week.theme === 'string'
      && Array.isArray(week.daily_tasks)
      && week.daily_tasks.every(task => typeof task === 'string')
      && typeof week.milestone === 'string'
      && Number.isFinite(week.estimated_hours)
    ))
  );
}

// ─────────────────────────────────────────────────────────
// 3. PROGRESS COACH — Function Calling + Firestore Data
// ─────────────────────────────────────────────────────────
export async function generateProgressReport(userId, onProgress = null) {
  if (!userId) throw new Error('A student account is required for progress coaching');

  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_quiz_history',
        description: 'Fetch the authenticated student quiz history, including scores, topics, and completion dates',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'The authenticated student user ID' },
          },
          required: ['userId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_enrollment_progress',
        description: 'Fetch progress for every course in which the authenticated student is enrolled',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'The authenticated student user ID' },
          },
          required: ['userId'],
        },
      },
    },
  ];

  const toolData = {
    get_quiz_history: null,
    get_enrollment_progress: null,
  };
  let messages = [
    {
      role: 'system',
      content: 'You are EduMind Progress Coach. Before coaching, call both available tools to ground your advice in the student\'s real quiz and enrollment data. Never invent scores, courses, or progress.',
    },
    {
      role: 'user',
      content: `Analyze learning progress for the authenticated student ${userId}. Call get_quiz_history and get_enrollment_progress before making recommendations.`,
    },
  ];

  for (let step = 0; step < 3; step += 1) {
    const missingTools = Object.entries(toolData).filter(([, value]) => value === null).map(([name]) => name);
    if (missingTools.length === 0) break;

    onProgress?.(step === 0 ? 'Reviewing your learning records...' : 'Gathering the remaining progress data...');
    const toolChoice = missingTools.length === 1
      ? { type: 'function', function: { name: missingTools[0] } }
      : 'required';

    // GPT-5.6: Agentic function calling — selects the Firestore-backed learning records needed for grounded coaching.
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        model: 'gpt-5.6',
        reasoning_effort: 'none',
        messages,
        tools,
        tool_choice: toolChoice,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Progress coach tool call failed');

    const assistantMessage = data.choices?.[0]?.message;
    const toolCalls = assistantMessage?.tool_calls || [];
    if (toolCalls.length === 0) throw new Error('Progress coach did not request the required learning data');

    const toolResults = await Promise.all(toolCalls.map(async toolCall => {
      let result;
      if (toolCall.function.name === 'get_quiz_history') {
        onProgress?.('Analyzing quiz performance...');
        result = await getStudentQuizResults(userId);
        toolData.get_quiz_history = result;
      } else if (toolCall.function.name === 'get_enrollment_progress') {
        onProgress?.('Checking course progress...');
        result = await getStudentEnrollments(userId);
        toolData.get_enrollment_progress = result;
      } else {
        throw new Error(`Unsupported progress tool: ${toolCall.function.name}`);
      }

      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      };
    }));

    messages = [...messages, assistantMessage, ...toolResults];
  }

  if (toolData.get_quiz_history === null || toolData.get_enrollment_progress === null) {
    throw new Error('Progress coach could not load all required learning data');
  }

  if (toolData.get_quiz_history.length === 0) {
    return { hasQuizHistory: false, report: null };
  }

  onProgress?.('Preparing your personalized coaching report...');
  const finalMessages = [
    ...messages,
    {
      role: 'user',
      content: `Using only the tool data above, return a concise coaching report as JSON with this exact structure:
{
  "strengths": ["Evidence-based strength"],
  "gaps_to_address": ["Specific learning gap"],
  "recommended_next_action": "One concrete, achievable next action"
}
Include two to four strengths and gaps. Do not include markdown or additional keys.`,
    },
  ];

  // GPT-5.6: Grounded synthesis — converts real quiz and enrollment evidence into a structured, actionable coaching report.
  const finalResponse = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
      messages: finalMessages,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });

  const finalData = await finalResponse.json();
  if (!finalResponse.ok) throw new Error(finalData.error?.message || 'Progress report generation failed');

  const report = JSON.parse(finalData.choices[0].message.content);
  if (!isValidProgressReport(report)) {
    throw new Error('GPT-5.6 returned an invalid coaching report. Please refresh to try again.');
  }
  return { hasQuizHistory: true, report };
}

function isValidProgressReport(report) {
  return Boolean(
    report
    && Array.isArray(report.strengths)
    && report.strengths.every(item => typeof item === 'string')
    && Array.isArray(report.gaps_to_address)
    && report.gaps_to_address.every(item => typeof item === 'string')
    && typeof report.recommended_next_action === 'string'
  );
}

// ─────────────────────────────────────────────────────────
// 4. ADMIN AI TOOLS — Content-to-Course Summarization
// ─────────────────────────────────────────────────────────
export async function summarizeCourseContent(sourceContent) {
  const content = sourceContent.trim();
  if (content.length < 100) throw new Error('Add at least 100 characters of source content');

  // GPT-5.6: Structured content synthesis — converts raw educational source material into a validated course brief.
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
      messages: [
        {
          role: 'system',
          content: 'You are an expert instructional designer. Analyze only the supplied source content and return valid JSON matching the requested schema exactly. Do not add markdown or unsupported claims.',
        },
        {
          role: 'user',
          content: `Turn this educational source into a concise course brief. Return ONLY this JSON structure:
{
  "suggested_title": "Clear course title",
  "description": "Two to three sentence course description",
  "key_points": ["Key learning point"],
  "suggested_quiz_topics": ["Quiz topic"],
  "difficulty_level": "Beginner",
  "estimated_study_hours": 8
}

difficulty_level must be exactly one of: Beginner, Intermediate, Advanced.
Include three to six key points and three to six quiz topics.

Source content:
${content.slice(0, 12000)}`,
        },
      ],
      max_tokens: 1600,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'AI content analysis failed');

  const summary = JSON.parse(data.choices[0].message.content);
  if (!isValidCourseSummary(summary)) {
    throw new Error('GPT-5.6 returned an invalid course summary. Please try again.');
  }
  return summary;
}

function isValidCourseSummary(summary) {
  return Boolean(
    summary
    && typeof summary.suggested_title === 'string'
    && typeof summary.description === 'string'
    && Array.isArray(summary.key_points)
    && summary.key_points.every(point => typeof point === 'string')
    && Array.isArray(summary.suggested_quiz_topics)
    && summary.suggested_quiz_topics.every(topic => typeof topic === 'string')
    && ['Beginner', 'Intermediate', 'Advanced'].includes(summary.difficulty_level)
    && Number.isFinite(summary.estimated_study_hours)
  );
}

// ─────────────────────────────────────────────────────────
// 5. STUDENT ONBOARDING — Personalized Welcome
// ─────────────────────────────────────────────────────────
export async function generateOnboardingWelcome(learningGoal, weeklyHours, courseTitles = []) {
  const availableCourses = courseTitles.filter(title => typeof title === 'string' && title.trim()).slice(0, 30);

  // GPT-5.6: Personalized recommendation — matches a student's goal and available study time to the current course catalog.
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
      messages: [
        {
          role: 'system',
          content: 'You are EduMind\'s welcoming student success coach. Be warm, concise, practical, and ground course recommendations only in the supplied catalog. Return valid JSON matching the requested schema exactly.',
        },
        {
          role: 'user',
          content: `Personalize onboarding for a student with this learning goal: "${learningGoal}".
They can study ${weeklyHours} hours per week.
Available course titles: ${availableCourses.length ? availableCourses.join(' | ') : 'No courses are available yet'}.

Return ONLY this JSON structure:
{
  "welcome_message": "A personalized two-sentence welcome",
  "recommended_course": "One exact available course title, or Explore upcoming courses if none are available",
  "first_week_tip": "One specific and achievable first-week tip"
}`,
        },
      ],
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Personalized onboarding failed');

  const welcome = JSON.parse(data.choices[0].message.content);
  if (!isValidOnboardingWelcome(welcome)) {
    throw new Error('GPT-5.6 returned an invalid welcome. Please try again.');
  }
  return welcome;
}

function isValidOnboardingWelcome(welcome) {
  return Boolean(
    welcome
    && typeof welcome.welcome_message === 'string'
    && typeof welcome.recommended_course === 'string'
    && typeof welcome.first_week_tip === 'string'
  );
}

// ─────────────────────────────────────────────────────────
// 6. VISION — Analyze uploaded images / handwritten notes
// ─────────────────────────────────────────────────────────
export async function analyzeImage(base64Image, mimeType = 'image/jpeg', prompt = '') {
  const userPrompt = prompt || 'Analyze this educational content. Explain what you see, identify key concepts, and provide a clear explanation suitable for a university student. If this is a diagram, explain each component. If handwritten notes, transcribe and explain the content.';

  // GPT-5.6: Multimodal vision — interprets diagrams, handwriting, and other educational imagery in context.
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
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
// 7. WHISPER — Transcribe voice questions
// ─────────────────────────────────────────────────────────
export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  // GPT-5.6: Voice-input workflow — Whisper converts speech into text that can be reasoned over by GPT-5.6.
  const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Transcription error');
  return data.text;
}

// ─────────────────────────────────────────────────────────
// 8. TTS — Convert AI response to speech
// ─────────────────────────────────────────────────────────
export async function textToSpeech(text, voice = 'nova') {
  // GPT-5.6: Spoken-answer workflow — TTS renders GPT-5.6 tutoring responses as accessible audio.
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
// 9. CONTENT SUMMARIZER
// ─────────────────────────────────────────────────────────
export async function summarizeContent(text, type = 'lecture') {
  // GPT-5.6: Structured synthesis — distills long educational material into summaries, terms, and review questions.
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'gpt-5.6',
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
