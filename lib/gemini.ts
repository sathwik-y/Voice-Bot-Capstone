import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not found in environment variables. Query preprocessing will be disabled.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export type QueryIntent = 'cgpa' | 'attendance' | 'faculty' | 'courses' | 'course_details' | 'general_status' | 'next_class' | 'today_schedule' | 'empty_rooms' | 'room_status' | 'my_students' | 'timetable' | 'unknown';

export interface QueryUnderstanding {
  intent: QueryIntent;
  normalizedQuery: string;
  entities: {
    courseName?: string;
    courseCode?: string;
    roomId?: string;
    day?: string;
    time?: string;
    studentRoll?: string;
  };
  confidence: number;
  reasoning?: string;
}

/**
 * Use Gemini to understand and normalize a user query
 */
export async function understandQuery(
  userQuery: string,
  lastContext?: { lastQuery: string; lastResponse: string }
): Promise<QueryUnderstanding> {
  if (!genAI) {
    return fallbackQueryUnderstanding(userQuery);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      }
    });

    const contextPrompt = lastContext
      ? `\n\nPrevious conversation context:\nUser asked: "${lastContext.lastQuery}"\nAssistant replied: "${lastContext.lastResponse}"`
      : '';

    const prompt = `You are an intent extraction system for an academic assistant. Extract intent from user queries.

User Query: "${userQuery}"${contextPrompt}

Return ONLY valid JSON (no markdown):
{
  "intent": "<one of: cgpa, attendance, faculty, courses, course_details, general_status, next_class, today_schedule, empty_rooms, room_status, my_students, timetable, unknown>",
  "normalizedQuery": "<clear question in standard English>",
  "entities": {
    "courseName": "<full course name if mentioned, or null>",
    "courseCode": "<course code if mentioned, or null>",
    "roomId": "<room in format 'ICT / 519' if mentioned, or null>",
    "day": "<day of week capitalized if mentioned, e.g. Monday, or null>",
    "time": "<time in HH:MM:00 24h format if mentioned, e.g. 12:00:00, or null>",
    "studentRoll": "<student roll number like VU22CSEN0101112 if mentioned, or null>"
  },
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief reason>"
}

Intent definitions:
- cgpa: CGPA/GPA/grades/performance. "How am I doing?" "Am I scoring well?" "GPA?"
- attendance: Attendance/presence. "Am I attending regularly?"
- faculty: Who teaches a course. "Who teaches ML?"
- courses: What courses enrolled in. "What am I studying?"
- course_details: Specific course info, syllabus, credits
- general_status: Overall academic summary. "How are my academics?" "Show my progress"
- next_class: Next upcoming class. "What's my next class?" "When do I teach next?" "Do I have class now?" "Am I free right now?"
- today_schedule: Today's full schedule. "What classes today?" "Today's schedule" "My schedule?"
- empty_rooms: Room availability. "Which rooms are free?" "Any empty classrooms?" "Which rooms are occupied?" "Rooms being used?"
- room_status: What's in a specific room. "What's in ICT 519?" "Is ICT 602D free?"
- my_students: Faculty's enrolled students. "Who are my students?" "How many students?"
- timetable: Full weekly timetable, room allocations. "Show the timetable" "Room allocations"
- unknown: Cannot determine

IMPORTANT RULES:
- "room 302" or "ICT 302" → roomId should be "ICT / 302"
- Any bare room number → assume ICT building, format as "ICT / <number>"
- Roll numbers look like VU22CSEN0101112 — always extract them
- "Which rooms are occupied/being used" → empty_rooms intent
- "Is <room> free?" → room_status intent
- "My schedule?" or "Schedule?" → today_schedule
- "When do I teach next?" or "Am I free?" → next_class
- "What can you do?" or "Help" → unknown (will show help)
- "Room allocations" or "Show all rooms" → timetable`;

    let result;
    let lastError;

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`Gemini API error (attempt ${attempt + 1}/3):`, error.message);
        if (error.message?.includes('API key') || error.message?.includes('403')) break;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    if (!result) throw lastError || new Error('Failed to get response from Gemini');

    const response = result.response.text();
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const understanding = JSON.parse(cleanedResponse) as QueryUnderstanding;

    // Normalize roomId if present
    if (understanding.entities?.roomId) {
      const { normalizeRoomId } = await import('@/lib/mongodb');
      understanding.entities.roomId = normalizeRoomId(understanding.entities.roomId);
    }

    console.log('Query understanding:', understanding);
    return understanding;
  } catch (error) {
    console.error('Error in query understanding:', error);
    return fallbackQueryUnderstanding(userQuery);
  }
}

/**
 * Generate a natural language response from student data using Gemini
 * This replaces the n8n workflow
 */
export async function generateAcademicResponse(
  studentData: any,
  userQuery: string,
  intent: string,
  lastContext?: { lastQuery: string; lastResponse: string }
): Promise<string> {
  if (!genAI) {
    return formatAcademicDataFallback(studentData, intent);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      }
    });

    const prevContext = lastContext
      ? `Previous question: ${lastContext.lastQuery}\nPrevious answer: ${lastContext.lastResponse}`
      : 'None';

    const isGeneralStatus = intent === 'general_status';
    const responseStyle = isGeneralStatus ? '2-3 short sentences' : 'one short, clear sentence';
    const contextHint = isGeneralStatus
      ? '\nIMPORTANT: User wants an OVERALL SUMMARY. Provide CGPA, average attendance, and number of courses. Keep to 2-3 sentences max.'
      : '';

    const prompt = `You are an academic assistant. Answer the question using ONLY the provided student data.

Student Data:
${JSON.stringify(studentData, null, 2)}

Question: ${userQuery}

Previous Context:
${prevContext}
${contextHint}

Rules:
- If data exists, answer directly.
- If missing, say: "I don't have that information."
- Answer in ${responseStyle}.
- Do not explain your reasoning.
- Be conversational and friendly.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    return response || formatAcademicDataFallback(studentData, intent);
  } catch (error) {
    console.error('Gemini response generation error:', error);
    return formatAcademicDataFallback(studentData, intent);
  }
}

/**
 * Format academic data without Gemini (fallback)
 */
function formatAcademicDataFallback(data: any, intent: string): string {
  switch (intent) {
    case 'cgpa':
      if (data.cgpa != null) return `Your current CGPA is ${data.cgpa}${data.sgpa ? ` (SGPA: ${data.sgpa})` : ''}.`;
      return 'I don\'t have CGPA data available.';
    case 'attendance':
      if (data.attendance && data.attendance.length > 0) {
        const list = data.attendance.map((a: any) => `${a.name || a.code}: ${a.percentage || a.attendancePercentage || 'N/A'}%`).join(', ');
        return `Your attendance: ${list}.`;
      }
      return 'I don\'t have attendance data available.';
    case 'courses':
    case 'course_details':
      if (data.courses && data.courses.length > 0) {
        const list = data.courses.map((c: any) => c.name || c.title || c.code).join(', ');
        return `You are enrolled in ${data.courses.length} courses: ${list}.`;
      }
      return 'I don\'t have course data available.';
    case 'faculty':
      if (data.faculty && Object.keys(data.faculty).length > 0) {
        const entries = Object.entries(data.faculty).map(([code, val]) => {
          const name = typeof val === 'object' && val !== null ? (val as any).name || JSON.stringify(val) : String(val);
          return { code, name };
        });
        // If courses data is available, enrich with course names
        if (data.courses && data.courses.length > 0) {
          const list = entries.map(e => {
            const course = data.courses.find((c: any) => c.code === e.code);
            return course ? `${course.name || course.title} (${e.code}): ${e.name}` : `${e.code}: ${e.name}`;
          }).join(', ');
          return `Your faculty: ${list}.`;
        }
        return `Your faculty: ${entries.map(e => `${e.code}: ${e.name}`).join(', ')}.`;
      }
      return 'I don\'t have faculty data available.';
    case 'general_status':
      const parts = [];
      if (data.cgpa != null) parts.push(`CGPA: ${data.cgpa}`);
      if (data.attendance?.length > 0) {
        const avg = data.attendance.reduce((sum: number, a: any) => sum + (a.percentage || a.attendancePercentage || 0), 0) / data.attendance.length;
        parts.push(`Average attendance: ${avg.toFixed(1)}%`);
      }
      if (data.courses?.length > 0) parts.push(`${data.courses.length} courses enrolled`);
      return parts.length > 0 ? parts.join('. ') + '.' : 'I don\'t have your academic data available.';
    default:
      return 'I don\'t have that information. Try asking about your CGPA, attendance, courses, or schedule.';
  }
}

/**
 * Fallback query understanding using keyword matching
 */
function fallbackQueryUnderstanding(query: string): QueryUnderstanding {
  const lowerQuery = query.toLowerCase();

  let intent: QueryIntent = 'unknown';
  let normalizedQuery = query;
  let reasoning = 'Fallback keyword matching';
  const entities: QueryUnderstanding['entities'] = {};

  // Extract day entity
  const dayMatch = lowerQuery.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (dayMatch) {
    entities.day = dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1);
  }

  // Extract time entity
  const timeMatch12 = lowerQuery.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  const timeMatch24 = lowerQuery.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch12) {
    let hours = parseInt(timeMatch12[1]);
    const minutes = timeMatch12[2] || '00';
    const ampm = timeMatch12[3].replace(/\./g, '').toLowerCase();
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    entities.time = `${String(hours).padStart(2, '0')}:${minutes}:00`;
  } else if (timeMatch24) {
    entities.time = `${String(parseInt(timeMatch24[1])).padStart(2, '0')}:${timeMatch24[2]}:00`;
  }

  // Extract room entity (various formats)
  const roomMatch = query.match(/\b(ICT|LH)\s*\/?\s*(\d+\w?)\b/i);
  const bareRoomMatch = !roomMatch && query.match(/\broom\s*(\d+\w?)\b/i);
  if (roomMatch) {
    entities.roomId = `${roomMatch[1].toUpperCase()} / ${roomMatch[2]}`;
  } else if (bareRoomMatch) {
    entities.roomId = `ICT / ${bareRoomMatch[1]}`;
  }

  // Extract student roll number
  const rollMatch = query.match(/VU\d{2}CSEN\d{7}/i);
  if (rollMatch) {
    entities.studentRoll = rollMatch[0].toUpperCase();
  }

  // ── Intent matching (order matters) ──

  // Next class / schedule
  if (lowerQuery.match(/next\s*(class|lecture|period|teaching)/)) {
    intent = 'next_class';
    normalizedQuery = 'What is my next class?';
    reasoning = 'Keyword: next class';
  } else if (lowerQuery.match(/when\s*(do\s*i|is\s*my)\s*(teach|class|lecture)/)) {
    intent = 'next_class';
    normalizedQuery = 'When is my next class?';
    reasoning = 'Keyword: when teach/class';
  } else if (lowerQuery.match(/(am i|are you)\s*free/) || lowerQuery.match(/do i have\s*(a\s*)?(class|lecture)\s*(now|right now)/)) {
    intent = 'next_class';
    normalizedQuery = 'Do I have a class now?';
    reasoning = 'Keyword: free/class now';
  } else if (lowerQuery.match(/any\s*(more\s*)?class/) || lowerQuery.match(/more\s*class/)) {
    intent = 'next_class';
    normalizedQuery = 'Any more classes?';
    reasoning = 'Keyword: any more classes';
  }
  // Classes happening now
  else if (lowerQuery.match(/class.*happening\s*(now|right now|today)|happening.*class/)) {
    intent = 'today_schedule';
    normalizedQuery = 'What classes are happening now?';
    reasoning = 'Keyword: classes happening now';
  }
  // Today schedule
  else if (lowerQuery.match(/today.*(class|schedule|timetable|lecture)/) || lowerQuery.match(/(class|schedule|timetable|lecture).*today/) || lowerQuery.match(/^my\s*schedule\??$/i) || lowerQuery.match(/^schedule\??$/i)) {
    intent = 'today_schedule';
    normalizedQuery = 'What is my schedule for today?';
    reasoning = 'Keyword: today schedule';
  }
  // Room: "is X free?" → room_status
  else if (lowerQuery.match(/is\s*(ict|lh|room)\s*\S+\s*free/i)) {
    intent = 'room_status';
    normalizedQuery = query;
    reasoning = 'Keyword: is room free';
  }
  // Empty rooms (including occupied/being used)
  else if (lowerQuery.match(/(empty|free|available|vacant|occupied|being used).*(room|class)/) || lowerQuery.match(/(room|class).*(empty|free|available|vacant|occupied|being used)/)) {
    intent = 'empty_rooms';
    normalizedQuery = 'Which rooms are available?';
    reasoning = 'Keyword: room availability';
  }
  // Room status
  else if (lowerQuery.match(/room\s*(status|info)/) || lowerQuery.match(/what.*(in|happening).*(room|ict|lh)/i) || lowerQuery.match(/(what|who).*(ict|lh)\s*\/?/i)) {
    intent = 'room_status';
    normalizedQuery = query;
    reasoning = 'Keyword: room status';
  }
  // My students
  else if (lowerQuery.match(/my students|how many students|student list|enrolled students|class roster|students.*enrolled|students.*taking|students.*in my/)) {
    intent = 'my_students';
    normalizedQuery = 'Who are my students?';
    reasoning = 'Keyword: my students';
  }
  // Timetable / room allocations
  else if (lowerQuery.match(/\b(timetable|time table|room allocations?|all rooms?|show.*schedule)\b/) && !lowerQuery.includes('today')) {
    intent = 'timetable';
    normalizedQuery = 'Show the full timetable';
    reasoning = 'Keyword: timetable';
  }
  // Semantic: performance / doing
  else if (lowerQuery.match(/how (am i|are my|is my|'s|s) (doing|academics|performing|going|everything)/)) {
    if (lowerQuery.includes('everything') || lowerQuery.includes('academics') || lowerQuery.includes('going')) {
      intent = 'general_status';
      normalizedQuery = 'How are my academics overall?';
      reasoning = 'Semantic: overall academic status';
    } else {
      intent = 'cgpa';
      normalizedQuery = 'What is my CGPA?';
      reasoning = 'Semantic: performance (CGPA)';
    }
  } else if (lowerQuery.match(/(am i|is my) (scoring|performing) (well|good|okay)/)) {
    intent = 'cgpa';
    normalizedQuery = 'What is my CGPA?';
    reasoning = 'Semantic: scoring question';
  } else if (lowerQuery.match(/show (me )?(my )?(progress|status|academics)/)) {
    intent = 'general_status';
    normalizedQuery = 'Show my academic progress';
    reasoning = 'Semantic: comprehensive overview';
  } else if (lowerQuery.match(/(on track|overview|how are things)/)) {
    intent = 'general_status';
    normalizedQuery = 'How are my academics?';
    reasoning = 'Semantic: overview request';
  } else if (lowerQuery.match(/what (am i|are my) (studying|taking|enrolled)/)) {
    intent = 'courses';
    normalizedQuery = 'What courses am I enrolled in?';
    reasoning = 'Semantic: courses';
  }
  // Keyword: CGPA/GPA
  else if (lowerQuery.match(/\b(cgpa|gpa|grades?|academic score)\b/)) {
    intent = 'cgpa';
    normalizedQuery = 'What is my CGPA?';
    reasoning = 'Keyword: CGPA/GPA';
  }
  // Keyword: attendance (broader matching)
  else if (lowerQuery.match(/\b(attendance|attend|attending)\b/)) {
    intent = 'attendance';
    normalizedQuery = query.includes('?') ? query : 'What is my attendance?';
    reasoning = 'Keyword: attendance';
  }
  // Keyword: faculty/teacher (broader matching)
  else if (lowerQuery.match(/who\s*teach|faculty|teacher|professor|instructor|who('s| is)\s*(the\s*)?(prof|teacher|faculty)/)) {
    intent = 'faculty';
    normalizedQuery = query.includes('?') ? query : 'Who teaches this course?';
    reasoning = 'Keyword: faculty';
  }
  // Keyword: course/classes/subjects/registered
  else if (lowerQuery.match(/\b(courses?|classes\s*(i|am|registered|enrolled)|subjects?\s*(i|am|do)|registered\s*for|enrolled\s*in|what\s*(am i|courses|subjects))\b/) && !lowerQuery.match(/next|free|room|happening/)) {
    intent = 'courses';
    normalizedQuery = 'What courses am I enrolled in?';
    reasoning = 'Keyword: course';
  }
  // Help / what can you do
  else if (lowerQuery.match(/\b(help|what can you|what do you|capabilities)\b/)) {
    intent = 'unknown';
    normalizedQuery = 'What can you do?';
    reasoning = 'Help request';
  }

  return {
    intent,
    normalizedQuery,
    entities,
    confidence: 0.5,
    reasoning
  };
}

/**
 * Generate an enhanced query for n8n (kept for backward compat)
 */
export function enhanceQueryForN8N(
  understanding: QueryUnderstanding,
  originalQuery: string
): string {
  const { intent, normalizedQuery, entities } = understanding;
  if (intent === 'general_status') return 'Provide a summary of my academic status including CGPA, overall attendance, and current courses.';
  if (understanding.confidence > 0.7 && entities.courseName) {
    switch (intent) {
      case 'attendance': return `What is my attendance percentage in ${entities.courseName}?`;
      case 'faculty': return `Who is the faculty member teaching ${entities.courseName}?`;
      case 'course_details': return `Tell me about the course ${entities.courseName}.`;
    }
  }
  return normalizedQuery || originalQuery;
}
