import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'student';

let client: MongoClient | null = null;
let db: Db | null = null;

async function getDb(): Promise<Db> {
  if (db) return db;
  if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

// ─── Helpers ───────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getCurrentDay(): string {
  return WEEKDAYS[new Date().getDay()];
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
}

/** Normalize room IDs: "ICT 519" → "ICT / 519", "room 302" → "ICT / 302", "LH 102" → "LH / 102" */
export function normalizeRoomId(input: string): string {
  let cleaned = input.trim();
  // Remove leading "room" prefix
  cleaned = cleaned.replace(/^room\s*/i, '');
  // "ICT519" or "ICT 519" or "ICT/519" → "ICT / 519"
  const match = cleaned.match(/^(ICT|LH)\s*\/?\s*(\d+\w*)$/i);
  if (match) {
    return `${match[1].toUpperCase()} / ${match[2]}`;
  }
  // Bare number like "302" → assume ICT
  if (/^\d+\w*$/.test(cleaned)) {
    return `ICT / ${cleaned}`;
  }
  return cleaned;
}

// ─── Student Queries ────────────────────────────────────────

export async function getStudentByRoll(rollNumber: string) {
  const database = await getDb();
  return database.collection('student').findOne({ rollNumber });
}

/** Get student schedule for a specific day (defaults to today) */
export async function getStudentScheduleForDay(rollNumber: string, day?: string) {
  const student = await getStudentByRoll(rollNumber);
  if (!student) return null;

  const targetDay = day || getCurrentDay();

  if (targetDay === 'Sunday' || targetDay === 'Saturday') {
    return { isHoliday: true, day: targetDay, classes: [] };
  }

  const classes: any[] = [];
  for (const course of (student.registeredCourses || [])) {
    for (const slot of (course.schedule || [])) {
      if (slot.startsWith(targetDay)) {
        const time = slot.replace(`${targetDay}: `, '');
        classes.push({
          time,
          code: course.code,
          title: course.title,
          room: course.room,
          instructor: course.instructor,
        });
      }
    }
  }

  classes.sort((a, b) => a.time.localeCompare(b.time));
  return { isHoliday: false, day: targetDay, classes };
}

export async function getStudentScheduleToday(rollNumber: string) {
  return getStudentScheduleForDay(rollNumber);
}

/** Find the next upcoming class, looking ahead to future days if needed */
export async function getStudentNextClass(rollNumber: string) {
  const student = await getStudentByRoll(rollNumber);
  if (!student) return null;

  const today = getCurrentDay();
  const currentTime = getCurrentTime();
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = dayOrder.indexOf(today);

  // Check today first (if weekday), then upcoming days
  const daysToCheck = todayIdx >= 0 ? dayOrder.slice(todayIdx) : dayOrder;

  for (const day of daysToCheck) {
    const schedule = await getStudentScheduleForDay(rollNumber, day);
    if (!schedule || schedule.isHoliday) continue;

    for (const cls of schedule.classes) {
      const startTime = cls.time.split(' - ')[0];
      // If checking today, only consider future classes
      if (day === today && startTime < currentTime) continue;

      const isToday = day === today;
      const timeStr = isToday
        ? `today at ${startTime.substring(0, 5)}`
        : `${day} at ${startTime.substring(0, 5)}`;

      return {
        isHoliday: false,
        day,
        nextClass: cls,
        message: `Your next class is ${cls.title} (${cls.code}) on ${timeStr} in ${cls.room} with ${cls.instructor}.`,
      };
    }
  }

  // If today is weekend or no more classes this week
  if (today === 'Sunday' || today === 'Saturday') {
    // Look at next week starting Monday
    for (const day of dayOrder) {
      const schedule = await getStudentScheduleForDay(rollNumber, day);
      if (!schedule || schedule.isHoliday || schedule.classes.length === 0) continue;
      const cls = schedule.classes[0];
      const startTime = cls.time.split(' - ')[0];
      return {
        isHoliday: false,
        day,
        nextClass: cls,
        message: `Your next class is ${cls.title} (${cls.code}) on ${day} at ${startTime.substring(0, 5)} in ${cls.room} with ${cls.instructor}.`,
      };
    }
  }

  return { isHoliday: false, day: today, message: 'No upcoming classes found this week.' };
}

// ─── Faculty Queries ────────────────────────────────────────

export async function getFacultyByLoginId(facultyId: string) {
  const database = await getDb();
  return database.collection('faculty').findOne({ facultyId });
}

export async function getFacultyScheduleForDay(facultyId: string, day?: string) {
  const faculty = await getFacultyByLoginId(facultyId);
  if (!faculty) return null;

  const targetDay = day || getCurrentDay();

  if (targetDay === 'Sunday' || targetDay === 'Saturday') {
    return { isHoliday: true, day: targetDay, classes: [] };
  }

  const classes: any[] = [];
  for (const course of (faculty.courses || [])) {
    for (const slot of (course.schedule || [])) {
      if (slot.startsWith(targetDay)) {
        const time = slot.replace(`${targetDay}: `, '');
        classes.push({
          time,
          code: course.code,
          title: course.title,
          room: course.room,
          studentCount: (course.enrolledStudents || []).length,
        });
      }
    }
  }

  classes.sort((a, b) => a.time.localeCompare(b.time));
  return { isHoliday: false, day: targetDay, classes };
}

export async function getFacultyScheduleToday(facultyId: string) {
  return getFacultyScheduleForDay(facultyId);
}

export async function getFacultyNextClass(facultyId: string) {
  const faculty = await getFacultyByLoginId(facultyId);
  if (!faculty) return null;

  const today = getCurrentDay();
  const currentTime = getCurrentTime();
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = dayOrder.indexOf(today);

  const daysToCheck = todayIdx >= 0 ? dayOrder.slice(todayIdx) : dayOrder;

  for (const day of daysToCheck) {
    const schedule = await getFacultyScheduleForDay(facultyId, day);
    if (!schedule || schedule.isHoliday) continue;

    for (const cls of schedule.classes) {
      const startTime = cls.time.split(' - ')[0];
      if (day === today && startTime < currentTime) continue;

      const isToday = day === today;
      const timeStr = isToday
        ? `today at ${startTime.substring(0, 5)}`
        : `${day} at ${startTime.substring(0, 5)}`;

      return {
        isHoliday: false,
        day,
        nextClass: cls,
        message: `Your next class is ${cls.title} (${cls.code}) on ${timeStr} in ${cls.room} with ${cls.studentCount} students.`,
      };
    }
  }

  // Weekend: look at next week
  if (today === 'Sunday' || today === 'Saturday') {
    for (const day of dayOrder) {
      const schedule = await getFacultyScheduleForDay(facultyId, day);
      if (!schedule || schedule.isHoliday || schedule.classes.length === 0) continue;
      const cls = schedule.classes[0];
      const startTime = cls.time.split(' - ')[0];
      return {
        isHoliday: false,
        day,
        nextClass: cls,
        message: `Your next class is ${cls.title} (${cls.code}) on ${day} at ${startTime.substring(0, 5)} in ${cls.room} with ${cls.studentCount} students.`,
      };
    }
  }

  return { isHoliday: false, day: today, message: 'No upcoming classes found this week.' };
}

export async function getFacultyStudents(facultyId: string) {
  const faculty = await getFacultyByLoginId(facultyId);
  if (!faculty) return null;

  const database = await getDb();
  const allStudentRolls = new Set<string>();
  for (const course of (faculty.courses || [])) {
    for (const roll of (course.enrolledStudents || [])) {
      allStudentRolls.add(roll);
    }
  }

  const students = await database.collection('student')
    .find({ rollNumber: { $in: Array.from(allStudentRolls) } }, { projection: { rollNumber: 1, name: 1, attendance: 1 } })
    .toArray();

  return {
    faculty: faculty.name,
    courses: faculty.courses?.map((c: any) => ({
      code: c.code,
      title: c.title,
      enrolledCount: c.enrolledStudents?.length || 0,
    })),
    students: students.map((s: any) => ({ rollNumber: s.rollNumber, name: s.name })),
    totalStudents: students.length,
  };
}

// ─── Room Queries ───────────────────────────────────────────

export async function getAvailableRooms(specificDay?: string, specificTime?: string) {
  const database = await getDb();
  const today = getCurrentDay();
  const queryDay = specificDay || today;
  const queryTime = specificTime || getCurrentTime();

  if (queryDay === 'Sunday' || queryDay === 'Saturday') {
    const allRooms = await database.collection('rooms').find({}).toArray();
    return { isHoliday: true, day: queryDay, availableRooms: allRooms.map((r: any) => r.roomId), message: `${queryDay} has no classes! All rooms are available.` };
  }

  const allRooms = await database.collection('rooms').find({}).toArray();
  const available: string[] = [];
  const occupied: any[] = [];

  for (const room of allRooms) {
    let isOccupied = false;
    for (const slot of (room.schedule || [])) {
      if (slot.day === queryDay) {
        const [start, end] = slot.time.split(' - ');
        if (queryTime >= start && queryTime < end) {
          isOccupied = true;
          occupied.push({ room: room.roomId, course: slot.courseTitle, instructor: slot.instructor, time: slot.time });
          break;
        }
      }
    }
    if (!isOccupied) available.push(room.roomId);
  }

  return { isHoliday: false, day: queryDay, time: queryTime, availableRooms: available, occupiedRooms: occupied };
}

/** Get students enrolled in courses taught in a specific room */
export async function getStudentsInRoom(roomId: string) {
  const database = await getDb();
  const today = getCurrentDay();
  const normalized = normalizeRoomId(roomId);

  const rooms = await database.collection('rooms').find({
    $or: [{ roomId }, { roomId: normalized }]
  }).toArray();

  if (rooms.length === 0) {
    // Fuzzy match
    const numMatch = roomId.match(/(\d+\w*)/);
    if (numMatch) {
      const all = await database.collection('rooms').find({}).toArray();
      const matches = all.filter((r: any) => r.roomId.includes(numMatch[1]));
      if (matches.length > 0) rooms.push(...matches);
    }
  }
  if (rooms.length === 0) return null;

  const room = rooms[0];
  const todaySlots = (room.schedule || []).filter((s: any) => s.day === today);
  const courseCodes = [...new Set(todaySlots.map((s: any) => s.courseCode))];

  const facultyDocs = await database.collection('faculty').find({
    'courses.code': { $in: courseCodes }
  }).toArray();

  const courseRolls: Record<string, string[]> = {};
  for (const fac of facultyDocs) {
    for (const course of (fac.courses || [])) {
      if (courseCodes.includes(course.code) && course.enrolledStudents?.length) {
        if (!courseRolls[course.code]) courseRolls[course.code] = [];
        for (const r of course.enrolledStudents) {
          if (!courseRolls[course.code].includes(r)) courseRolls[course.code].push(r);
        }
      }
    }
  }

  const allRolls = [...new Set(Object.values(courseRolls).flat())];
  const studentDocs = allRolls.length > 0
    ? await database.collection('student').find(
        { rollNumber: { $in: allRolls } },
        { projection: { rollNumber: 1, name: 1 } }
      ).toArray()
    : [];
  const rollToName: Record<string, string> = {};
  for (const s of studentDocs) rollToName[s.rollNumber] = s.name;

  return {
    roomId: room.roomId,
    classes: todaySlots.map((s: any) => ({
      time: s.time,
      courseCode: s.courseCode,
      courseTitle: s.courseTitle,
      instructor: s.instructor,
      students: (courseRolls[s.courseCode] || []).map(r => ({ rollNumber: r, name: rollToName[r] || r })),
    })),
  };
}

export async function getRoomStatus(roomId?: string) {
  const database = await getDb();
  const today = getCurrentDay();

  // Try exact match first, then normalized match
  let queryFilter: any = {};
  if (roomId) {
    const normalized = normalizeRoomId(roomId);
    // Try both the original and normalized forms
    queryFilter = { $or: [{ roomId: roomId }, { roomId: normalized }] };
  }

  const rooms = await database.collection('rooms').find(queryFilter).toArray();

  // If no exact match, try fuzzy match on the number part
  if (rooms.length === 0 && roomId) {
    const numMatch = roomId.match(/(\d+\w*)/);
    if (numMatch) {
      const allRooms = await database.collection('rooms').find({}).toArray();
      const fuzzyMatches = allRooms.filter((r: any) => r.roomId.includes(numMatch[1]));
      if (fuzzyMatches.length > 0) {
        return fuzzyMatches.map((room: any) => {
          const todaySchedule = (room.schedule || []).filter((s: any) => s.day === today);
          todaySchedule.sort((a: any, b: any) => a.time.localeCompare(b.time));
          return { roomId: room.roomId, building: room.building, todayClasses: todaySchedule };
        });
      }
    }
  }

  return rooms.map((room: any) => {
    const todaySchedule = (room.schedule || []).filter((s: any) => s.day === today);
    todaySchedule.sort((a: any, b: any) => a.time.localeCompare(b.time));
    return {
      roomId: room.roomId,
      building: room.building,
      todayClasses: todaySchedule,
    };
  });
}

// ─── Admin Queries ──────────────────────────────────────────

export async function getTimetableForDay(day: string) {
  const database = await getDb();
  const timetable = await database.collection('timetable').findOne({ day });
  return timetable;
}

/** Get classes scheduled on a day, optionally filtered by time, with enrolled student details */
export async function getClassesOnDay(day: string, time?: string) {
  const database = await getDb();
  const timetable = await database.collection('timetable').findOne({ day });
  if (!timetable || !timetable.slots || timetable.slots.length === 0) {
    return { day, classes: [], message: `No classes scheduled on ${day}.` };
  }

  let slots = timetable.slots;

  // Filter by time if specified
  if (time) {
    slots = slots.filter((s: any) => {
      const [start, end] = s.time.split(' - ');
      return time >= start && time < end;
    });
  }

  // Sort by time then room
  slots.sort((a: any, b: any) => a.time.localeCompare(b.time) || a.room.localeCompare(b.room));

  // Get enrolled students from faculty collection for each course
  const courseCodes = [...new Set(slots.map((s: any) => s.courseCode))];
  const facultyDocs = await database.collection('faculty').find({
    'courses.code': { $in: courseCodes }
  }).toArray();

  // Build courseCode → enrolledStudents map
  const courseStudentsMap: Record<string, string[]> = {};
  for (const fac of facultyDocs) {
    for (const course of (fac.courses || [])) {
      if (courseCodes.includes(course.code) && course.enrolledStudents?.length > 0) {
        if (!courseStudentsMap[course.code]) courseStudentsMap[course.code] = [];
        for (const roll of course.enrolledStudents) {
          if (!courseStudentsMap[course.code].includes(roll)) {
            courseStudentsMap[course.code].push(roll);
          }
        }
      }
    }
  }

  // Get student names
  const allRolls = [...new Set(Object.values(courseStudentsMap).flat())];
  const studentDocs = allRolls.length > 0
    ? await database.collection('student').find(
        { rollNumber: { $in: allRolls } },
        { projection: { rollNumber: 1, name: 1 } }
      ).toArray()
    : [];
  const rollToName: Record<string, string> = {};
  for (const s of studentDocs) {
    rollToName[s.rollNumber] = s.name;
  }

  // Enrich slots with student info
  const enrichedSlots = slots.map((s: any) => {
    const enrolledRolls = courseStudentsMap[s.courseCode] || [];
    const students = enrolledRolls.map(r => ({ rollNumber: r, name: rollToName[r] || r }));
    return {
      time: s.time,
      room: s.room,
      courseCode: s.courseCode,
      courseTitle: s.courseTitle,
      instructor: s.instructor,
      studentCount: students.length,
      students,
    };
  });

  return { day, time: time || null, classes: enrichedSlots };
}

export async function getFullTimetable() {
  const database = await getDb();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timetable = await database.collection('timetable').find({ day: { $in: days } }).toArray();
  return timetable;
}

export async function getAllStudents() {
  const database = await getDb();
  return database.collection('student').find({}, { projection: { rollNumber: 1, name: 1, currentSemester: 1, attendance: 1 } }).toArray();
}

export async function getAllFaculty() {
  const database = await getDb();
  return database.collection('faculty').find({}).toArray();
}
