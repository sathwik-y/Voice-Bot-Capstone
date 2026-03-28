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
    studentRoll?: string;
  };
  confidence: number;
  reasoning?: string;
}

/**
 * Use Gemini 2.5 Flash to understand and normalize a user query
 * This handles:
 * - Informal language ("GPA?" instead of "What is my CGPA?")
 * - Abbreviations ("ML" instead of "Machine Learning")
 * - Misspellings and fuzzy keywords
 * - Context-aware understanding
 */
export async function understandQuery(
  userQuery: string,
  lastContext?: { lastQuery: string; lastResponse: string }
): Promise<QueryUnderstanding> {
  if (!genAI) {
    // Fallback: basic keyword matching
    return fallbackQueryUnderstanding(userQuery);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent intent extraction
        maxOutputTokens: 200,
      }
    });

    const contextPrompt = lastContext
      ? `\n\nPrevious conversation context:\nUser asked: "${lastContext.lastQuery}"\nAssistant replied: "${lastContext.lastResponse}"`
      : '';

    const prompt = `You are an intent extraction system for an academic assistant. You MUST understand user queries semantically, even when NO keywords are present.

User Query: "${userQuery}"${contextPrompt}

Extract the following information in JSON format:
{
  "intent": "<one of: cgpa, attendance, faculty, courses, course_details, general_status, next_class, today_schedule, empty_rooms, room_status, my_students, timetable, unknown>",
  "normalizedQuery": "<a clear, complete question in standard English>",
  "entities": {
    "courseName": "<full course name if mentioned>",
    "courseCode": "<course code if mentioned>",
    "roomId": "<room number if mentioned, e.g. ICT / 519>",
    "day": "<day of week if mentioned>",
    "studentRoll": "<student roll number if mentioned>"
  },
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation of why you chose this intent>"
}

Intent definitions with semantic understanding:
- cgpa: Asking about CGPA, GPA, grades, academic performance, "how am I doing", "am I scoring well"
- attendance: Asking about attendance, presence, classes attended, "am I attending regularly"
- faculty: Asking who teaches, professor, instructor for a course
- courses: Asking about enrolled courses, subjects, what courses they're taking
- course_details: Asking about specific course information, syllabus, credits
- general_status: Asking for overall academic summary/overview, "how are my academics", "show my progress"
- next_class: Asking about the next upcoming class, "what's my next class", "when is my next lecture", "do I have class now"
- today_schedule: Asking about today's full schedule, "what classes do I have today", "today's timetable", "my schedule for today"
- empty_rooms: Asking which rooms/classrooms are free/available, "which rooms are empty", "any free classrooms", "where can I sit"
- room_status: Asking what's happening in a specific room, "what's in room 519", "who's in ICT 206"
- my_students: Faculty asking about their enrolled students, "who are my students", "how many students do I have"
- timetable: Asking about the full weekly timetable, room allocations, "show the timetable", "room allocations"
- unknown: Cannot determine intent at all

CRITICAL SEMANTIC UNDERSTANDING RULES:
1. NO KEYWORDS NEEDED - understand meaning, not just words
   - "How am I doing?" → cgpa (asking about academic performance)
   - "Am I scoring well?" → cgpa (asking about grades)
   - "How are my academics?" → general_status (asking for overview)
   - "Am I attending regularly?" → attendance (asking about presence)
   - "What am I studying?" → courses (asking about subjects)

2. Context is king - use meaning, not exact words
   - "How's everything going?" → general_status (overall performance)
   - "Am I doing good?" → cgpa (performance question)
   - "Show me my progress" → general_status (comprehensive overview)

3. Normalize informal language
   - "GPA?" → "What is my CGPA?"
   - "Doing okay?" → "How is my academic performance?"

4. Expand abbreviations (use context if available)

5. Handle misspellings gracefully

6. Use previous context to resolve ambiguous references ("that course" → actual course name)

7. When in doubt between cgpa and general_status:
   - If asking about specific performance/grades/scoring → cgpa
   - If asking about overall academics/everything/status → general_status

EXAMPLES:
- "How are my academics?" → general_status (overview of everything)
- "Am I doing well?" → cgpa (performance/grades)
- "How's everything?" → general_status (comprehensive status)
- "Am I scoring good?" → cgpa (specifically about grades)
- "Show my progress" → general_status (overall academic progress)
- "What's my performance?" → cgpa (academic performance metric)
- "What's my next class?" → next_class
- "Do I have class now?" → next_class
- "When is my next lecture?" → next_class
- "What classes do I have today?" → today_schedule
- "Today's schedule" → today_schedule
- "Which rooms are free?" → empty_rooms
- "Any empty classrooms?" → empty_rooms
- "Where can I sit and work?" → empty_rooms
- "What's happening in room 519?" → room_status
- "Who are my students?" → my_students (faculty context)
- "Show the timetable" → timetable
- "Is there class on Saturday?" → today_schedule

Return ONLY valid JSON, no markdown formatting.`;

    // Add retry logic for transient failures
    let result;
    let lastError;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`Gemini API error (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);

        // Don't retry on certain errors
        if (error.message?.includes('API key') || error.message?.includes('403')) {
          break; // Auth errors won't be fixed by retrying
        }

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Failed to get response from Gemini');
    }

    const response = result.response.text();

    // Clean up response (remove markdown code blocks if present)
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const understanding = JSON.parse(cleanedResponse) as QueryUnderstanding;

    console.log('Query understanding:', understanding);

    return understanding;
  } catch (error) {
    console.error('Error in query understanding:', error);
    // Fallback to basic understanding
    return fallbackQueryUnderstanding(userQuery);
  }
}

/**
 * Fallback query understanding using basic keyword matching
 * Used when Gemini API is unavailable
 */
function fallbackQueryUnderstanding(query: string): QueryUnderstanding {
  const lowerQuery = query.toLowerCase();

  let intent: QueryIntent = 'unknown';
  let normalizedQuery = query;
  let reasoning = 'Fallback keyword matching';

  // Schedule patterns
  if (lowerQuery.match(/next (class|lecture|period)/)) {
    intent = 'next_class';
    normalizedQuery = 'What is my next class?';
    reasoning = 'Keyword: next class detected';
  } else if (lowerQuery.match(/today.*(class|schedule|timetable|lecture)/) || lowerQuery.match(/(class|schedule|timetable|lecture).*today/)) {
    intent = 'today_schedule';
    normalizedQuery = 'What is my schedule for today?';
    reasoning = 'Keyword: today schedule detected';
  } else if (lowerQuery.match(/(empty|free|available|vacant).*(room|class)/) || lowerQuery.match(/(room|class).*(empty|free|available|vacant)/)) {
    intent = 'empty_rooms';
    normalizedQuery = 'Which rooms are available right now?';
    reasoning = 'Keyword: empty rooms detected';
  } else if (lowerQuery.match(/room\s*(status|info)/) || lowerQuery.match(/what.*(in|happening).*(room|ict)/i)) {
    intent = 'room_status';
    normalizedQuery = query;
    reasoning = 'Keyword: room status detected';
  } else if (lowerQuery.match(/my students/) || lowerQuery.match(/students.*enrolled/)) {
    intent = 'my_students';
    normalizedQuery = 'Who are my students?';
    reasoning = 'Keyword: my students detected';
  } else if (lowerQuery.match(/timetable|time table/) && !lowerQuery.includes('today')) {
    intent = 'timetable';
    normalizedQuery = 'Show the full timetable';
    reasoning = 'Keyword: timetable detected';
  }
  // Semantic patterns (NO keywords needed)
  else if (lowerQuery.match(/how (am i|are my|is my|'s|s) (doing|academics|performing|going|everything)/)) {
    if (lowerQuery.includes('everything') || lowerQuery.includes('academics') || lowerQuery.includes('going')) {
      intent = 'general_status';
      normalizedQuery = 'How are my academics overall?';
      reasoning = 'Semantic: asking about overall academic status';
    } else {
      intent = 'cgpa';
      normalizedQuery = 'What is my CGPA?';
      reasoning = 'Semantic: asking about performance (likely CGPA)';
    }
  } else if (lowerQuery.match(/(am i|is my) (scoring|performing) (well|good|okay)/)) {
    intent = 'cgpa';
    normalizedQuery = 'What is my CGPA?';
    reasoning = 'Semantic: performance/scoring question';
  } else if (lowerQuery.match(/show (me )?(my )?(progress|status|academics)/)) {
    intent = 'general_status';
    normalizedQuery = 'Show me my overall academic progress';
    reasoning = 'Semantic: requesting comprehensive overview';
  } else if (lowerQuery.match(/what (am i|are my) (studying|taking|enrolled)/)) {
    intent = 'courses';
    normalizedQuery = 'What courses am I enrolled in?';
    reasoning = 'Semantic: asking about courses/subjects';
  } else if (lowerQuery.includes('cgpa') || lowerQuery.includes('gpa') || lowerQuery.match(/\bgpa\b/)) {
    intent = 'cgpa';
    normalizedQuery = 'What is my CGPA?';
    reasoning = 'Keyword: cgpa/gpa detected';
  } else if (lowerQuery.includes('attendance') || lowerQuery.includes('attend')) {
    intent = 'attendance';
    normalizedQuery = query.includes('?') ? query : `What is my attendance?`;
    reasoning = 'Keyword: attendance detected';
  } else if (lowerQuery.includes('faculty') || lowerQuery.includes('teacher') || lowerQuery.includes('professor') || lowerQuery.includes('teach')) {
    intent = 'faculty';
    normalizedQuery = query.includes('?') ? query : `Who teaches this course?`;
    reasoning = 'Keyword: faculty/teacher detected';
  } else if (lowerQuery.includes('course')) {
    intent = 'courses';
    normalizedQuery = 'What courses am I enrolled in?';
    reasoning = 'Keyword: course detected';
  }

  return {
    intent,
    normalizedQuery,
    entities: {},
    confidence: 0.5,
    reasoning
  };
}

/**
 * Generate an enhanced query that combines user intent with student data context
 * This helps the main LLM in n8n understand what the user is asking for
 */
export function enhanceQueryForN8N(
  understanding: QueryUnderstanding,
  originalQuery: string
): string {
  const { intent, normalizedQuery, entities } = understanding;

  // Handle general_status intent with specific summary request
  if (intent === 'general_status') {
    return 'Provide a summary of my academic status including CGPA, overall attendance, and current courses.';
  }

  // If we have high confidence and extracted entities, create a more specific query
  if (understanding.confidence > 0.7 && entities.courseName) {
    switch (intent) {
      case 'attendance':
        return `What is my attendance percentage in ${entities.courseName}?`;
      case 'faculty':
        return `Who is the faculty member teaching ${entities.courseName}?`;
      case 'course_details':
        return `Tell me about the course ${entities.courseName}.`;
    }
  }

  // Otherwise use the normalized query or original
  return normalizedQuery || originalQuery;
}
