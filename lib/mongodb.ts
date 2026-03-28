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

// ─── Student Queries ────────────────────────────────────────

export async function getStudentByRoll(rollNumber: string) {
  const database = await getDb();
  return database.collection('student').findOne({ rollNumber });
}

export async function getStudentScheduleToday(rollNumber: string) {
  const student = await getStudentByRoll(rollNumber);
  if (!student) return null;

  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[now.getDay()];

  if (today === 'Sunday' || today === 'Saturday') {
    return { isHoliday: true, day: today, classes: [] };
  }

  const classes: any[] = [];
  for (const course of (student.registeredCourses || [])) {
    for (const slot of (course.schedule || [])) {
      if (slot.startsWith(today)) {
        const time = slot.replace(`${today}: `, '');
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
  return { isHoliday: false, day: today, classes };
}

export async function getStudentNextClass(rollNumber: string) {
  const schedule = await getStudentScheduleToday(rollNumber);
  if (!schedule) return null;
  if (schedule.isHoliday) return { isHoliday: true, day: schedule.day, message: `It's ${schedule.day}! No classes today, enjoy your holiday!` };
  if (schedule.classes.length === 0) return { isHoliday: false, day: schedule.day, message: `No classes scheduled for today (${schedule.day}).` };

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

  const upcoming = schedule.classes.filter((c: any) => {
    const startTime = c.time.split(' - ')[0];
    return startTime >= currentTime;
  });

  if (upcoming.length === 0) {
    return { isHoliday: false, day: schedule.day, message: 'All classes are done for today! No more classes remaining.', classes: schedule.classes };
  }

  const next = upcoming[0];
  return {
    isHoliday: false,
    day: schedule.day,
    nextClass: next,
    remaining: upcoming.length,
    message: `Your next class is ${next.title} (${next.code}) at ${next.time.split(' - ')[0]} in ${next.room} with ${next.instructor}. You have ${upcoming.length} class${upcoming.length > 1 ? 'es' : ''} remaining today.`,
  };
}

// ─── Faculty Queries ────────────────────────────────────────

export async function getFacultyByLoginId(facultyId: string) {
  const database = await getDb();
  return database.collection('faculty').findOne({ facultyId });
}

export async function getFacultyScheduleToday(facultyId: string) {
  const faculty = await getFacultyByLoginId(facultyId);
  if (!faculty) return null;

  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[now.getDay()];

  if (today === 'Sunday' || today === 'Saturday') {
    return { isHoliday: true, day: today, classes: [] };
  }

  const classes: any[] = [];
  for (const course of (faculty.courses || [])) {
    for (const slot of (course.schedule || [])) {
      if (slot.startsWith(today)) {
        const time = slot.replace(`${today}: `, '');
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
  return { isHoliday: false, day: today, classes };
}

export async function getFacultyNextClass(facultyId: string) {
  const schedule = await getFacultyScheduleToday(facultyId);
  if (!schedule) return null;
  if (schedule.isHoliday) return { isHoliday: true, day: schedule.day, message: `It's ${schedule.day}! No classes today, enjoy your weekend!` };
  if (schedule.classes.length === 0) return { isHoliday: false, day: schedule.day, message: `No classes scheduled for today (${schedule.day}).` };

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

  const upcoming = schedule.classes.filter((c: any) => {
    const startTime = c.time.split(' - ')[0];
    return startTime >= currentTime;
  });

  if (upcoming.length === 0) {
    return { isHoliday: false, day: schedule.day, message: 'All your classes are done for today!', classes: schedule.classes };
  }

  const next = upcoming[0];
  return {
    isHoliday: false,
    day: schedule.day,
    nextClass: next,
    remaining: upcoming.length,
    message: `Your next class is ${next.title} (${next.code}) at ${next.time.split(' - ')[0]} in ${next.room} with ${next.studentCount} students. You have ${upcoming.length} class${upcoming.length > 1 ? 'es' : ''} remaining today.`,
  };
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

export async function getAvailableRooms() {
  const database = await getDb();
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[now.getDay()];

  if (today === 'Sunday' || today === 'Saturday') {
    const allRooms = await database.collection('rooms').find({}).toArray();
    return { isHoliday: true, day: today, availableRooms: allRooms.map((r: any) => r.roomId), message: `It's ${today}! All rooms are available.` };
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

  const allRooms = await database.collection('rooms').find({}).toArray();
  const available: string[] = [];
  const occupied: any[] = [];

  for (const room of allRooms) {
    let isOccupied = false;
    for (const slot of (room.schedule || [])) {
      if (slot.day === today) {
        const [start, end] = slot.time.split(' - ');
        if (currentTime >= start && currentTime < end) {
          isOccupied = true;
          occupied.push({ room: room.roomId, course: slot.courseTitle, instructor: slot.instructor, until: end });
          break;
        }
      }
    }
    if (!isOccupied) available.push(room.roomId);
  }

  return { isHoliday: false, day: today, time: currentTime, availableRooms: available, occupiedRooms: occupied };
}

export async function getRoomStatus(roomId?: string) {
  const database = await getDb();
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[now.getDay()];

  const query = roomId ? { roomId } : {};
  const rooms = await database.collection('rooms').find(query).toArray();

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
