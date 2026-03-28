import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { get } from '@/lib/db';

const RINGG_API_KEY = process.env.RINGG_API_KEY || '';
const RINGG_BASE = 'https://prod-api.ringg.ai/ca/api/v0';
const AGENT_ID = '4975e69d-cce2-478c-9e57-60bb3a20d4cd';

/**
 * POST /api/phone/call
 * Initiates an outbound call to a student.
 * Pre-fetches their academic data from n8n/MongoDB and passes it to the Ringg agent
 * so the agent already knows who they are and has all their info.
 */
export async function POST(request: NextRequest) {
  try {
    // Only admin can initiate calls
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { rollNumber } = await request.json();
    if (!rollNumber) {
      return NextResponse.json({ error: 'rollNumber is required' }, { status: 400 });
    }

    // Look up user in local DB to get phone number
    const user = get(
      'SELECT id, name, phoneNumber, rollNumber FROM users WHERE rollNumber = ?',
      [rollNumber]
    ) as { id: number; name: string; phoneNumber: string | null; rollNumber: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!user.phoneNumber) {
      return NextResponse.json({ error: 'User has no phone number registered' }, { status: 400 });
    }

    // Fetch student data from n8n (which queries MongoDB)
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/capstone-voice';
    let studentData: any = {};

    try {
      const n8nRes = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Provide a complete summary of my academic status including CGPA, all course attendance percentages, and faculty names.',
          originalQuery: 'Full academic summary',
          intent: 'general_status',
          rollNumber: user.rollNumber,
          userId: user.id,
          userRole: 'student',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (n8nRes.ok) {
        const text = await n8nRes.text();
        if (text) {
          const data = JSON.parse(text);
          studentData.summary = data.output || data.response || '';
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch student data from n8n:', e.message);
    }

    // Also fetch specific data points
    const dataQueries = [
      { query: 'What is my CGPA?', intent: 'cgpa', key: 'cgpa_info' },
      { query: 'What is my attendance in all courses?', intent: 'attendance', key: 'attendance_info' },
      { query: 'Who are my faculty members?', intent: 'faculty', key: 'faculty_info' },
    ];

    for (const dq of dataQueries) {
      try {
        const res = await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: dq.query,
            intent: dq.intent,
            rollNumber: user.rollNumber,
            userId: user.id,
            userRole: 'student',
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            studentData[dq.key] = data.output || data.response || '';
          }
        }
      } catch { /* continue with what we have */ }
    }

    // Build the custom args with all student data for the Ringg agent
    const customArgs: Record<string, string> = {
      student_name: user.name || user.rollNumber,
      roll_number: user.rollNumber,
      cgpa: studentData.cgpa_info || studentData.summary || 'Data not available',
      semester: '7',
      courses: studentData.summary || 'Course data not available',
      attendance: studentData.attendance_info || 'Attendance data not available',
      faculty: studentData.faculty_info || 'Faculty data not available',
    };

    // Make the outbound call via Ringg
    const callRes = await fetch(`${RINGG_BASE}/calling/outbound/individual/`, {
      method: 'POST',
      headers: {
        'X-API-KEY': RINGG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        name: user.name || user.rollNumber,
        mobile_number: `+91${user.phoneNumber}`,
        from_number: '+918071387390',
        custom_args_values: customArgs,
      }),
    });

    const callData = await callRes.json();

    if (callRes.ok) {
      return NextResponse.json({
        message: `Calling ${user.name} at +91${user.phoneNumber}...`,
        call: callData,
        studentDataLoaded: Object.keys(studentData).length > 0,
      });
    } else {
      return NextResponse.json({ error: 'Failed to initiate call', details: callData }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Call initiation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
