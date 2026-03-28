import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { run, get, query } from '@/lib/db';
import { understandQuery, QueryIntent, generateAcademicResponse } from '@/lib/gemini';
import {
  getStudentNextClass, getStudentScheduleToday,
  getFacultyNextClass, getFacultyScheduleToday, getFacultyStudents, getFacultyByLoginId,
  getAvailableRooms, getRoomStatus, normalizeRoomId,
  getStudentByRoll, getClassesOnDay,
} from '@/lib/mongodb';

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

    // Try to extract roll number from query text if Gemini didn't catch it
    if (!understanding.entities.studentRoll) {
      const rollMatch = userQuery.match(/VU\d{2}CSEN\d{7}/i);
      if (rollMatch) understanding.entities.studentRoll = rollMatch[0].toUpperCase();
    }

    // Route based on role and intent
    aiResponse = await handleQuery(understanding, payload, userQuery, contextMessages);

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
    return NextResponse.json(
      { error: 'Failed to process query: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

// ─── Main query handler ───────────────────────────────────────

async function handleQuery(understanding: any, payload: any, userQuery: string, contextMessages: any[]): Promise<string> {
  const { intent } = understanding;
  const { rollNumber, role } = payload;

  try {
    // ── Schedule & Room queries (all roles) ──
    switch (intent) {
      case 'next_class': {
        if (role === 'faculty') {
          const result = await getFacultyNextClass(rollNumber);
          return result?.message || 'Could not find your schedule.';
        }
        if (role === 'admin') {
          return 'As admin, you don\'t have a personal class schedule. Try asking about room availability or a specific student\'s schedule.';
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
        if (role === 'admin') {
          const today = new Date();
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = days[today.getDay()];
          if (dayName === 'Saturday' || dayName === 'Sunday') {
            return `It's ${dayName}! No classes today — enjoy your weekend!`;
          }
          return 'As admin, you can ask about room availability, specific room status, or the timetable for any day.';
        }
        const schedule = await getStudentScheduleToday(rollNumber);
        if (!schedule) return 'Could not find your schedule.';
        if (schedule.isHoliday) return `It's ${schedule.day}! No classes today — enjoy your holiday!`;
        if (schedule.classes.length === 0) return `No classes scheduled for you today (${schedule.day}).`;
        const classList = schedule.classes.map((c: any) => `${c.time.split(' - ')[0]} - ${c.title} in ${c.room} (${c.instructor})`).join('\n');
        return `Your schedule for today (${schedule.day}):\n${classList}`;
      }

      case 'empty_rooms': {
        const requestedDay = understanding.entities?.day;
        const requestedTime = understanding.entities?.time;
        const rooms = await getAvailableRooms(requestedDay || undefined, requestedTime || undefined);
        if (rooms.isHoliday) return rooms.message || `All rooms are free on ${rooms.day}!`;
        const total = rooms.availableRooms.length + (rooms.occupiedRooms?.length || 0);
        if (rooms.availableRooms.length === 0) {
          return `All ${total} rooms are occupied on ${rooms.day} at ${rooms.time?.substring(0, 5)}.`;
        }
        const roomList = rooms.availableRooms.slice(0, 10).join(', ');
        const moreRooms = rooms.availableRooms.length > 10 ? ` (and ${rooms.availableRooms.length - 10} more)` : '';
        const timeLabel = rooms.time ? ` at ${rooms.time.substring(0, 5)}` : '';
        return `Available rooms on ${rooms.day}${timeLabel}: ${roomList}${moreRooms}. ${rooms.availableRooms.length} free out of ${total} total.`;
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

      case 'timetable': {
        const timetableDay = understanding.entities?.day;
        if (timetableDay) {
          const timetableTime = understanding.entities?.time;
          const queryLower = userQuery.toLowerCase();
          const wantsStudents = queryLower.match(/\b(students?|who('s| is| are)?\s*(in|enrolled|taking|attending)|enrolled|roster|list\s*of\s*students)\b/);
          const data = await getClassesOnDay(timetableDay, timetableTime || undefined);
          if (data.classes.length === 0) {
            return timetableTime
              ? `No classes at ${timetableTime.substring(0, 5)} on ${data.day}.`
              : `No classes on ${data.day}.`;
          }
          const timeLabel = timetableTime ? ` at ${timetableTime.substring(0, 5)}` : '';
          const lines = data.classes.map((c: any) => {
            let line = `${c.time.substring(0, 5)} | ${c.room} | ${c.courseTitle} — ${c.instructor}`;
            if (wantsStudents && c.students.length > 0) {
              line += ` | Students: ${c.students.map((s: any) => s.name).join(', ')}`;
            }
            return line;
          });
          return `${data.classes.length} class${data.classes.length > 1 ? 'es' : ''} on ${data.day}${timeLabel}:\n${lines.join('\n')}`;
        }
        return 'Ask about a specific day, e.g. "What classes are on Monday?" or "Classes at 9 AM on Tuesday".';
      }

      case 'my_students': {
        if (role !== 'faculty' && role !== 'admin') return 'This query is for faculty members.';
        const data = await getFacultyStudents(rollNumber);
        if (!data) return 'Faculty profile not found.';
        const studentNames = data.students.map((s: any) => `${s.name} (${s.rollNumber})`).join(', ');
        const courseInfo = data.courses.map((c: any) => `${c.title}: ${c.enrolledCount} students`).join('; ');
        return `You have ${data.totalStudents} student(s). Courses: ${courseInfo}. Students: ${studentNames}.`;
      }
    }

    // ── Help / unknown intent ──
    if (intent === 'unknown') {
      // If there's a student roll number, try to look up their data anyway
      if (understanding.entities?.studentRoll) {
        if (role === 'faculty' || role === 'admin') {
          return handleStudentLookup({ ...understanding, intent: 'general_status' }, understanding.entities.studentRoll, userQuery, contextMessages);
        }
      }
      return getHelpMessage(role);
    }

    // ── Faculty/Admin: own course/student queries ──
    if (role === 'faculty' || role === 'admin') {
      return handleFacultyAdminQuery(understanding, payload, userQuery, contextMessages);
    }

    // ── Student: academic data queries (direct MongoDB, no n8n) ──
    return handleStudentAcademicQuery(understanding, rollNumber, userQuery, contextMessages);

  } catch (error: any) {
    console.error('Query handling error:', error);
    return 'Sorry, I had trouble processing that. Please try again.';
  }
}

// ─── Help messages ────────────────────────────────────────────

function getHelpMessage(role: string): string {
  if (role === 'student') {
    return 'I can help you with:\n• CGPA and grades — "What\'s my CGPA?"\n• Attendance — "How\'s my attendance?"\n• Courses — "What courses do I have?"\n• Faculty — "Who teaches Advanced Coding?"\n• Schedule — "What\'s my next class?" or "Today\'s schedule"\n• Room availability — "Which rooms are free?"\n• Room status — "What\'s in ICT 519?"';
  }
  if (role === 'faculty') {
    return 'I can help you with:\n• Your courses — "What do I teach?"\n• Your students — "Who are my students?"\n• Schedule — "What\'s my next class?" or "Today\'s schedule"\n• Room availability — "Which rooms are free on Monday?"\n• Room status — "What\'s in ICT 519?"\n• Student lookup — "What is the CGPA of VU22CSEN0101112?"';
  }
  return 'I can help you with:\n• Room availability — "Which rooms are free?" or "Rooms free on Monday at 10 AM"\n• Room status — "What\'s in ICT 519?"\n• Timetable — "Show the timetable"\n• Student data — "What is the CGPA of VU22CSEN0101112?"\n• Student courses — "What courses does VU22CSEN0100201 have?"';
}

// ─── Student academic data (replaces n8n) ─────────────────────

async function handleStudentAcademicQuery(understanding: any, rollNumber: string, userQuery: string, contextMessages: any[]): Promise<string> {
  const student = await getStudentByRoll(rollNumber);
  if (!student) return 'Could not find your student record. Please contact support.';

  const { intent } = understanding;

  // Build relevant data based on intent
  const semesters = student.grades?.semesters ?? {};
  const latestSemesterKey = Object.keys(semesters).sort((a: string, b: string) => Number(b) - Number(a))[0];
  const latestSemester = semesters[latestSemesterKey] ?? {};

  let relevantData: any = { rollNumber: student.rollNumber, name: student.name };

  switch (intent) {
    case 'cgpa':
      relevantData.cgpa = latestSemester.cgpa ?? null;
      relevantData.sgpa = latestSemester.sgpa ?? null;
      relevantData.grades = latestSemester.endGrades ?? [];
      break;
    case 'attendance':
      relevantData.attendance = student.attendance ?? [];
      break;
    case 'faculty':
      relevantData.faculty = student.faculty ?? {};
      relevantData.courses = student.currentSemesterCourses ?? student.registeredCourses?.map((c: any) => ({ code: c.code, name: c.title })) ?? [];
      break;
    case 'courses':
    case 'course_details':
      relevantData.courses =
        student.currentSemesterCourses ??
        student.registeredCourses?.map((c: any) => ({ code: c.code, name: c.title })) ??
        student.attendance?.map((a: any) => ({ code: a.code, name: a.name })) ??
        [];
      break;
    case 'general_status':
      relevantData.cgpa = latestSemester.cgpa ?? null;
      relevantData.sgpa = latestSemester.sgpa ?? null;
      relevantData.attendance = student.attendance ?? [];
      relevantData.courses =
        student.currentSemesterCourses ??
        student.attendance?.map((a: any) => ({ code: a.code, name: a.name })) ??
        [];
      break;
    default:
      // For unknown intents, give everything
      relevantData.cgpa = latestSemester.cgpa ?? null;
      relevantData.attendance = student.attendance ?? [];
      relevantData.courses =
        student.currentSemesterCourses ??
        student.attendance?.map((a: any) => ({ code: a.code, name: a.name })) ??
        [];
      break;
  }

  // Build context from conversation history
  const lastContext = contextMessages.length > 0
    ? { lastQuery: contextMessages[contextMessages.length - 1].query, lastResponse: contextMessages[contextMessages.length - 1].response }
    : undefined;

  // Use Gemini to generate a natural language response
  return generateAcademicResponse(relevantData, userQuery, intent, lastContext);
}

// ─── Faculty/Admin student lookup (with proper framing) ───────

async function handleStudentLookup(understanding: any, studentRoll: string, userQuery: string, contextMessages: any[]): Promise<string> {
  const student = await getStudentByRoll(studentRoll);
  if (!student) return `Student ${studentRoll} not found in the database.`;

  const { intent } = understanding;
  const semesters = student.grades?.semesters ?? {};
  const latestSemesterKey = Object.keys(semesters).sort((a: string, b: string) => Number(b) - Number(a))[0];
  const latestSemester = semesters[latestSemesterKey] ?? {};

  switch (intent) {
    case 'cgpa':
      if (latestSemester.cgpa != null) {
        return `${student.name} (${studentRoll}) has a CGPA of ${latestSemester.cgpa}${latestSemester.sgpa ? ` and SGPA of ${latestSemester.sgpa}` : ''}.`;
      }
      return `No CGPA data found for ${student.name} (${studentRoll}).`;

    case 'attendance':
      if (student.attendance && student.attendance.length > 0) {
        const list = student.attendance.map((a: any) => `${a.name || a.code}: ${a.percentage || a.attendancePercentage || 'N/A'}%`).join(', ');
        return `Attendance for ${student.name} (${studentRoll}): ${list}.`;
      }
      return `No attendance data found for ${student.name} (${studentRoll}).`;

    case 'courses':
    case 'course_details':
      const courses = student.currentSemesterCourses ?? student.registeredCourses?.map((c: any) => ({ code: c.code, name: c.title })) ?? [];
      if (courses.length > 0) {
        const list = courses.map((c: any) => c.name || c.title || c.code).join(', ');
        return `${student.name} (${studentRoll}) is enrolled in ${courses.length} courses: ${list}.`;
      }
      return `No course data found for ${student.name} (${studentRoll}).`;

    case 'faculty':
      if (student.faculty && Object.keys(student.faculty).length > 0) {
        const list = Object.entries(student.faculty).map(([code, val]) => {
          const name = typeof val === 'object' && val !== null ? (val as any).name || JSON.stringify(val) : String(val);
          return `${code}: ${name}`;
        }).join(', ');
        return `Faculty for ${student.name} (${studentRoll}): ${list}.`;
      }
      return `No faculty data found for ${student.name} (${studentRoll}).`;

    case 'general_status':
    default: {
      const parts = [`${student.name} (${studentRoll})`];
      if (latestSemester.cgpa != null) parts.push(`CGPA: ${latestSemester.cgpa}`);
      if (student.attendance?.length > 0) {
        const avg = student.attendance.reduce((sum: number, a: any) => sum + (a.percentage || a.attendancePercentage || 0), 0) / student.attendance.length;
        parts.push(`Avg attendance: ${avg.toFixed(1)}%`);
      }
      const courseCount = student.currentSemesterCourses?.length || student.registeredCourses?.length || 0;
      if (courseCount > 0) parts.push(`${courseCount} courses`);
      return parts.join(' | ');
    }
  }
}

// ─── Faculty/Admin academic queries ─────────────────────────

async function handleFacultyAdminQuery(understanding: any, payload: any, userQuery: string, contextMessages: any[]): Promise<string> {
  const queryLower = userQuery.toLowerCase();
  const { intent } = understanding;

  // Faculty asking about own courses
  if ((intent === 'courses' || intent === 'faculty' || intent === 'course_details') && payload.role === 'faculty') {
    try {
      const faculty = await getFacultyByLoginId(payload.rollNumber);
      if (faculty && faculty.courses?.length > 0) {
        const courseList = faculty.courses.map((c: any) => {
          const students = c.enrolledStudents?.length || 0;
          const schedule = (c.schedule || []).join(', ');
          return `${c.title} (${c.code}) - Room: ${c.room || 'TBD'}, ${students} students enrolled${schedule ? ', Schedule: ' + schedule : ''}`;
        }).join('\n');
        return `You teach ${faculty.courses.length} course(s):\n${courseList}`;
      }
    } catch { /* fall through */ }
  }

  // Faculty/admin asking about students (broader matching)
  const isStudentQuery = queryLower.match(/students?\s*(in|of|enrolled|taking|are|list)|who.*(in|taking|enrolled|my\s*course)|class\s*(list|roster|students)|how many students|student list|enrolled students|class roster/);
  if (isStudentQuery || intent === 'my_students') {
    if (payload.role === 'faculty') {
      try {
        const data = await getFacultyStudents(payload.rollNumber);
        if (data && data.students.length > 0) {
          const studentNames = data.students.map((s: any) => `${s.name} (${s.rollNumber})`).join(', ');
          const courseInfo = data.courses.map((c: any) => `${c.title}: ${c.enrolledCount} students`).join('; ');
          return `You have ${data.totalStudents} student(s). Courses: ${courseInfo}. Students: ${studentNames}.`;
        }
      } catch { /* fall through */ }
    }
  }

  // Faculty/admin looking up a specific student's data
  const studentRoll = understanding.entities?.studentRoll;
  if (studentRoll) {
    return handleStudentLookup(understanding, studentRoll, userQuery, contextMessages);
  }

  // If query mentions CGPA/attendance without a roll number, prompt for one
  if (intent === 'cgpa' || intent === 'attendance') {
    return `As ${payload.role}, you can look up any student's ${intent} by specifying their roll number. For example: "What is the CGPA of VU22CSEN0101112?"`;
  }

  // General status for faculty (not a student lookup)
  if (intent === 'general_status') {
    if (payload.role === 'faculty') {
      try {
        const faculty = await getFacultyByLoginId(payload.rollNumber);
        if (faculty && faculty.courses?.length > 0) {
          const courseNames = faculty.courses.map((c: any) => c.title).join(', ');
          return `You teach: ${courseNames}. Try asking about your next class, your students, or room availability.`;
        }
      } catch { /* fall through */ }
    }
    return getHelpMessage(payload.role);
  }

  // Default: try to answer as student data if roll number was provided
  return 'I\'m not sure how to answer that. Try asking about rooms, schedules, or student data (with a roll number).';
}
