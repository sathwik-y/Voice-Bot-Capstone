import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { run, get, query } from '@/lib/db';
import { understandQuery, enhanceQueryForN8N, QueryIntent } from '@/lib/gemini';
import {
  getStudentNextClass, getStudentScheduleToday,
  getFacultyNextClass, getFacultyScheduleToday, getFacultyStudents, getFacultyByLoginId,
  getAvailableRooms, getRoomStatus,
  getStudentByRoll,
} from '@/lib/mongodb';

// Intents that can be handled directly without n8n
const DIRECT_INTENTS: QueryIntent[] = ['next_class', 'today_schedule', 'empty_rooms', 'room_status', 'my_students', 'timetable'];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const userQuery = body.query;
    const source = body.source || 'text';

    if (!userQuery || typeof userQuery !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Multi-turn context
    let contextMessages: { query: string; response: string }[] = [];
    try {
      const recentConversations = query(
        'SELECT query, response FROM conversations WHERE userId = ? ORDER BY createdAt DESC LIMIT 5',
        [payload.userId]
      ) as { query: string; response: string }[];
      contextMessages = recentConversations.reverse();
    } catch (dbError) {
      console.error('Failed to fetch context:', dbError);
    }

    const lastContext = contextMessages.length > 0
      ? { lastQuery: contextMessages[contextMessages.length - 1].query, lastResponse: contextMessages[contextMessages.length - 1].response }
      : undefined;

    // Gemini intent extraction
    const understanding = await understandQuery(userQuery, lastContext);
    console.log(`[${payload.role}] Query: "${userQuery}" → Intent: ${understanding.intent} (${understanding.confidence})`);

    let aiResponse: string;

    // Route based on intent type
    if (DIRECT_INTENTS.includes(understanding.intent)) {
      // Handle schedule/room queries directly via MongoDB
      aiResponse = await handleDirectQuery(understanding.intent, payload.rollNumber, payload.role, understanding);
    } else if (payload.role === 'faculty' || payload.role === 'admin') {
      // Faculty/admin academic queries — try to find a student to query about
      // If the query mentions a student roll number, query that student's data via n8n
      // Otherwise, try to answer from faculty data or fall back to n8n with the first enrolled student
      aiResponse = await handleFacultyAdminQuery(understanding, payload, userQuery, contextMessages);
    } else {
      // Student academic queries → n8n (CGPA, attendance, courses, faculty, general_status)
      aiResponse = await queryN8N(understanding, payload, userQuery, contextMessages);
    }

    const responseTimeMs = Date.now() - startTime;

    // Save conversation
    try {
      run(
        'INSERT INTO conversations (userId, query, response, intent, confidence) VALUES (?, ?, ?, ?, ?)',
        [payload.userId, userQuery, aiResponse, understanding.intent, understanding.confidence]
      );
    } catch (dbError) { console.error('Failed to save conversation:', dbError); }

    // Save analytics
    try {
      run(
        'INSERT INTO query_analytics (userId, intent, confidence, responseTimeMs, source) VALUES (?, ?, ?, ?, ?)',
        [payload.userId, understanding.intent, understanding.confidence, responseTimeMs, source]
      );
    } catch (dbError) { console.error('Failed to save analytics:', dbError); }

    return NextResponse.json({
      response: aiResponse,
      query: userQuery,
      normalizedQuery: understanding.normalizedQuery,
      intent: understanding.intent,
      confidence: understanding.confidence,
      reasoning: understanding.reasoning,
      responseTimeMs,
    });
  } catch (error: any) {
    console.error('Voice query error:', error);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json(
      { error: 'Failed to process query: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

// ─── Direct MongoDB queries (schedule, rooms, etc.) ─────────

async function handleDirectQuery(intent: QueryIntent, rollNumber: string, role: string, understanding: any): Promise<string> {
  try {
    switch (intent) {
      case 'next_class': {
        if (role === 'faculty') {
          const result = await getFacultyNextClass(rollNumber);
          return result?.message || 'Could not find your schedule. Make sure your faculty profile is set up.';
        }
        const result = await getStudentNextClass(rollNumber);
        return result?.message || 'Could not find your schedule.';
      }

      case 'today_schedule': {
        if (role === 'faculty') {
          const schedule = await getFacultyScheduleToday(rollNumber);
          if (!schedule) return 'Could not find your schedule.';
          if (schedule.isHoliday) return `It's ${schedule.day}! No classes today — enjoy your weekend!`;
          if (schedule.classes.length === 0) return `No classes scheduled for you today (${schedule.day}).`;
          const classList = schedule.classes.map((c: any) => `${c.time.split(' - ')[0]} - ${c.title} in ${c.room} (${c.studentCount} students)`).join('\n');
          return `Your schedule for today (${schedule.day}):\n${classList}`;
        }
        const schedule = await getStudentScheduleToday(rollNumber);
        if (!schedule) return 'Could not find your schedule.';
        if (schedule.isHoliday) return `It's ${schedule.day}! No classes today — enjoy your holiday!`;
        if (schedule.classes.length === 0) return `No classes scheduled for you today (${schedule.day}).`;
        const classList = schedule.classes.map((c: any) => `${c.time.split(' - ')[0]} - ${c.title} in ${c.room} (${c.instructor})`).join('\n');
        return `Your schedule for today (${schedule.day}):\n${classList}`;
      }

      case 'empty_rooms': {
        const rooms = await getAvailableRooms();
        if (rooms.isHoliday) return rooms.message || 'All rooms are free today!';
        if (rooms.availableRooms.length === 0) return 'All rooms are currently occupied.';
        const roomList = rooms.availableRooms.slice(0, 10).join(', ');
        return `Currently available rooms: ${roomList}. ${rooms.availableRooms.length} rooms free out of ${rooms.availableRooms.length + (rooms.occupiedRooms?.length || 0)} total.`;
      }

      case 'room_status': {
        const roomId = understanding.entities?.roomId;
        const statuses = await getRoomStatus(roomId || undefined);
        if (statuses.length === 0) return roomId ? `Room ${roomId} not found.` : 'No room data available.';
        if (roomId) {
          const room = statuses[0];
          if (room.todayClasses.length === 0) return `${room.roomId} has no classes scheduled today — it's free all day!`;
          const classes = room.todayClasses.map((c: any) => `${c.time} - ${c.courseTitle} (${c.instructor})`).join('\n');
          return `${room.roomId} today:\n${classes}`;
        }
        return `Found ${statuses.length} rooms. Ask about a specific room like "What's in ICT 519?"`;
      }

      case 'my_students': {
        if (role !== 'faculty' && role !== 'admin') return 'This query is for faculty members.';
        const data = await getFacultyStudents(rollNumber);
        if (!data) return 'Faculty profile not found. Make sure your account is linked to faculty data.';
        const studentNames = data.students.map((s: any) => `${s.name} (${s.rollNumber})`).join(', ');
        const courseInfo = data.courses.map((c: any) => `${c.title}: ${c.enrolledCount} students`).join('; ');
        return `Your students: ${studentNames}. Courses: ${courseInfo}.`;
      }

      case 'timetable': {
        return 'The full timetable is available in the admin dashboard. You can ask about specific days like "What classes are on Monday?" or specific rooms.';
      }

      default:
        return 'I could not process that query.';
    }
  } catch (error: any) {
    console.error('Direct query error:', error);
    return 'Sorry, I had trouble accessing the schedule data. Please try again.';
  }
}

// ─── Faculty/Admin academic queries ─────────────────────────

async function handleFacultyAdminQuery(understanding: any, payload: any, userQuery: string, contextMessages: any[]): Promise<string> {
  // If faculty is asking about their own courses/students/identity, handle directly
  if (understanding.intent === 'courses' || understanding.intent === 'faculty' || understanding.intent === 'course_details') {
    try {
      const faculty = await getFacultyByLoginId(payload.rollNumber);
      if (faculty && faculty.courses?.length > 0) {
        const courseList = faculty.courses.map((c: any) => {
          const students = c.enrolledStudents?.length || 0;
          const schedule = (c.schedule || []).join(', ');
          return `${c.title} (${c.code}) - Room: ${c.room || 'TBD'}, ${students} students enrolled${schedule ? ', Schedule: ' + schedule : ''}`;
        }).join('\n');
        return `You teach ${faculty.courses.length} course(s):\n${courseList}`;
      } else if (faculty) {
        return `You are ${faculty.name} in ${faculty.department || 'CSE'}. No courses currently assigned.`;
      }
    } catch { /* fall through to n8n */ }
  }

  // Catch student/class related queries that Gemini might misclassify
  const queryLower = userQuery.toLowerCase();
  const isStudentQuery = queryLower.match(/students?\s*(in|of|enrolled|taking|are|list)|who.*(in|taking|enrolled)|class\s*(list|roster|students)/);
  if (isStudentQuery || understanding.intent === 'my_students') {
    try {
      const data = await getFacultyStudents(payload.rollNumber);
      if (data && data.students.length > 0) {
        const studentNames = data.students.map((s: any) => `${s.name} (${s.rollNumber})`).join(', ');
        const courseInfo = data.courses.map((c: any) => `${c.title}: ${c.enrolledCount} students`).join('; ');
        return `Your students: ${studentNames}. Courses: ${courseInfo}.`;
      }
    } catch { /* fall through */ }
  }

  // Handle general/unknown queries with role-appropriate responses
  if (understanding.intent === 'unknown' || understanding.intent === 'general_status') {
    try {
      const faculty = await getFacultyByLoginId(payload.rollNumber);
      if (faculty && faculty.courses?.length > 0) {
        const courseNames = faculty.courses.map((c: any) => c.title).join(', ');
        return `As you are a faculty, I can help with your courses, schedule, students, and room availability. You teach: ${courseNames}. Try asking about your next class, today's schedule, or your students.`;
      }
    } catch { /* fall through */ }

    if (payload.role === 'admin') {
      return 'As you are an admin, I can help with room status, timetable, and student data. Try asking which rooms are free, or about a student by their roll number.';
    }
  }

  // For specific student-data queries (CGPA, attendance of a particular student)
  // Only proceed to n8n if they mention a specific student
  if (understanding.entities?.studentRoll) {
    return queryN8N(understanding, { ...payload, rollNumber: understanding.entities.studentRoll }, userQuery, contextMessages);
  }

  // Faculty/admin asking generic academic queries without specifying a student
  if (understanding.intent === 'cgpa' || understanding.intent === 'attendance') {
    return `As ${payload.role}, you can look up any student's ${understanding.intent} by specifying their roll number. For example: "What is the CGPA of VU22CSEN0101112?"`;
  }

  // Default: try n8n with a demo student for other intents
  return queryN8N(understanding, { ...payload, rollNumber: 'VU22CSEN0101112' }, userQuery, contextMessages);
}

// ─── n8n webhook query ──────────────────────────────────────

async function queryN8N(understanding: any, payload: any, userQuery: string, contextMessages: any[]): Promise<string> {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/capstone-voice';
  const enhancedQuery = enhanceQueryForN8N(understanding, userQuery);
  const conversationHistory = contextMessages.map((c: any) => `User: ${c.query}\nAssistant: ${c.response}`).join('\n\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let n8nResponse;
  let retries = 0;
  const maxRetries = 2;

  while (retries <= maxRetries) {
    try {
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: enhancedQuery,
          originalQuery: userQuery,
          intent: understanding.intent,
          rollNumber: payload.rollNumber,
          userId: payload.userId,
          userRole: payload.role,
          lastContext: contextMessages.length > 0 ? { lastQuery: contextMessages[contextMessages.length - 1].query, lastResponse: contextMessages[contextMessages.length - 1].response } : null,
          conversationHistory,
          entities: understanding.entities,
        }),
        signal: controller.signal,
      });

      if (n8nResponse.ok) break;

      if (n8nResponse.status === 503 && retries < maxRetries) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      throw new Error(`n8n workflow failed: ${n8nResponse.status}`);
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') throw fetchError;
      if (retries < maxRetries) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw fetchError;
    }
  }

  clearTimeout(timeoutId);

  if (!n8nResponse || !n8nResponse.ok) {
    throw new Error('n8n workflow failed after retries');
  }

  const responseText = await n8nResponse.text();
  if (!responseText || responseText.trim() === '') {
    return 'The academic data service returned no data. Please make sure the n8n workflow is active.';
  }

  let aiData;
  try {
    aiData = JSON.parse(responseText);
  } catch {
    return 'Received an invalid response from the academic data service.';
  }

  return aiData.output || aiData.response || aiData.text || 'I could not process that request.';
}
