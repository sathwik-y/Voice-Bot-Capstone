/**
 * Seed Academic Collections - Creates faculty, timetable, and rooms collections
 * from existing student data in MongoDB.
 *
 * Reads ALL student records from the `student` collection, then:
 *   1. Builds a `faculty` collection with course-student mappings
 *   2. Builds a `timetable` collection (one doc per weekday)
 *   3. Builds a `rooms` collection (one doc per unique room)
 *
 * Special faculty ID mappings:
 *   FAC001 -> "Muddala Murali Krishna"  (PROJ2999 Capstone Project)
 *   FAC002 -> "Pragnyaban Mishra"       (CSEN3161 Advanced Operating Systems)
 *   FAC003 -> "Amiripalli Shanmuk Srinivas" (CSEN4171/24CSEN2381 Social Network Analysis)
 *
 * Usage: node scripts/seed-academic.js
 */

const { MongoClient } = require('mongodb');

// Load from .env.local if dotenv is available, otherwise use env vars
try { require('dotenv').config({ path: '.env.local' }); } catch {}

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI not set. Add it to .env.local');
  process.exit(1);
}

const DB_NAME = 'student';

// ---------------------------------------------------------------------------
// Known faculty-ID mappings (these 3 correspond to login accounts)
// ---------------------------------------------------------------------------
const KNOWN_FACULTY = {
  'Muddala Murali Krishna': 'FAC001',
  'Pragnyaban Mishra': 'FAC002',
  'Amiripalli Shanmuk Srinivas': 'FAC003',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise an instructor name for dedup purposes.
 * Trims whitespace and collapses multiple spaces.
 */
function normaliseName(name) {
  return (name || '').trim().replace(/\s+/g, ' ');
}

/**
 * Parse a schedule string like "Monday: 14:00:00 - 14:50:00"
 * Returns { day, time } or null.
 */
function parseScheduleString(s) {
  if (!s || typeof s !== 'string') return null;
  const match = s.match(/^(\w+)\s*:\s*(.+)$/);
  if (!match) return null;
  return { day: match[1].trim(), time: match[2].trim() };
}

/**
 * Extract building and room number from a room string like "ICT / 519"
 */
function parseRoom(roomStr) {
  if (!roomStr || typeof roomStr !== 'string') {
    return { building: 'Unknown', roomNumber: 'Unknown' };
  }
  const parts = roomStr.split('/').map(p => p.trim());
  if (parts.length >= 2) {
    return { building: parts[0], roomNumber: parts.slice(1).join('/').trim() };
  }
  return { building: roomStr.trim(), roomNumber: '' };
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db(DB_NAME);

    // ------------------------------------------------------------------
    // Step 1: Read all student records
    // ------------------------------------------------------------------
    const studentCollection = db.collection('student');
    const students = await studentCollection.find({}).toArray();
    console.log(`\nFound ${students.length} student records in the 'student' collection.\n`);

    if (students.length === 0) {
      console.error('No student records found. Run seed-mongodb.js first.');
      return;
    }

    // ------------------------------------------------------------------
    // Step 2: Aggregate instructor -> courses -> enrolled students
    // ------------------------------------------------------------------

    // instructorMap: normalised name -> {
    //   name (original casing), email, phone, id,
    //   courses: Map<courseCode, { code, title, room, credits, schedule: Set, enrolledStudents: Set }>
    // }
    const instructorMap = new Map();

    for (const student of students) {
      const rollNumber = student.rollNumber;
      if (!rollNumber) continue;

      // Build a lookup from the student.faculty object (keyed by course code)
      const facultyLookup = {}; // courseCode -> { id, name, phone, email }
      if (student.faculty && typeof student.faculty === 'object') {
        for (const [code, info] of Object.entries(student.faculty)) {
          if (info && info.name) {
            facultyLookup[code] = info;
          }
        }
      }

      // Walk registeredCourses
      const courses = student.registeredCourses || [];
      for (const course of courses) {
        const instructorName = normaliseName(course.instructor);
        if (!instructorName) continue;

        const courseCode = course.code;

        // Try to find extra info from the faculty lookup
        const facInfo = facultyLookup[courseCode] || {};

        // Get or create instructor entry
        if (!instructorMap.has(instructorName)) {
          instructorMap.set(instructorName, {
            name: instructorName,
            email: facInfo.email || '',
            phone: facInfo.phone || '',
            id: facInfo.id || '',
            courses: new Map(),
          });
        }

        const instructor = instructorMap.get(instructorName);

        // Merge contact info if we have better data
        if (!instructor.email && facInfo.email) instructor.email = facInfo.email;
        if (!instructor.phone && facInfo.phone) instructor.phone = facInfo.phone;
        if (!instructor.id && facInfo.id) instructor.id = facInfo.id;

        // Get or create course entry for this instructor
        if (!instructor.courses.has(courseCode)) {
          instructor.courses.set(courseCode, {
            code: courseCode,
            title: course.title || '',
            room: course.room || '',
            credits: course.credits || 0,
            schedule: new Set(),
            enrolledStudents: new Set(),
          });
        }

        const courseEntry = instructor.courses.get(courseCode);

        // Add this student
        courseEntry.enrolledStudents.add(rollNumber);

        // Add schedule slots
        const scheduleArr = Array.isArray(course.schedule) ? course.schedule : [];
        for (const s of scheduleArr) {
          courseEntry.schedule.add(s);
        }
      }

      // Also scan the faculty object for instructors that might not appear
      // in registeredCourses.instructor (edge case)
      for (const [code, info] of Object.entries(facultyLookup)) {
        const name = normaliseName(info.name);
        if (!name) continue;
        if (!instructorMap.has(name)) {
          instructorMap.set(name, {
            name,
            email: info.email || '',
            phone: info.phone || '',
            id: info.id || '',
            courses: new Map(),
          });
        }
        const instr = instructorMap.get(name);
        if (!instr.email && info.email) instr.email = info.email;
        if (!instr.phone && info.phone) instr.phone = info.phone;
        if (!instr.id && info.id) instr.id = info.id;

        // If we don't already have this course for this instructor,
        // find the course details from registeredCourses
        if (!instr.courses.has(code)) {
          const regCourse = courses.find(c => c.code === code);
          if (regCourse) {
            const schedSet = new Set();
            const schedArr = Array.isArray(regCourse.schedule) ? regCourse.schedule : [];
            for (const s of schedArr) schedSet.add(s);

            instr.courses.set(code, {
              code,
              title: regCourse.title || '',
              room: regCourse.room || '',
              credits: regCourse.credits || 0,
              schedule: schedSet,
              enrolledStudents: new Set([rollNumber]),
            });
          }
        }
      }
    }

    console.log(`Found ${instructorMap.size} unique instructors.\n`);

    // ------------------------------------------------------------------
    // Step 3: Assign faculty IDs
    // ------------------------------------------------------------------

    // Determine which IDs are already taken by known mappings
    const assignedIds = new Set(Object.values(KNOWN_FACULTY));
    let nextFacNum = 4; // FAC004 onwards

    function getNextFacultyId() {
      let id;
      do {
        id = `FAC${String(nextFacNum).padStart(3, '0')}`;
        nextFacNum++;
      } while (assignedIds.has(id));
      assignedIds.add(id);
      return id;
    }

    // ------------------------------------------------------------------
    // Step 4: Build faculty documents
    // ------------------------------------------------------------------

    const facultyDocs = [];

    for (const [instrName, instrData] of instructorMap) {
      // Determine faculty ID
      let facultyId = KNOWN_FACULTY[instrName] || null;
      if (!facultyId) {
        facultyId = getNextFacultyId();
      }

      // Build courses array
      const coursesArr = [];
      for (const [, courseData] of instrData.courses) {
        coursesArr.push({
          code: courseData.code,
          title: courseData.title,
          room: courseData.room,
          credits: courseData.credits,
          schedule: Array.from(courseData.schedule).sort(),
          enrolledStudents: Array.from(courseData.enrolledStudents).sort(),
        });
      }

      // Sort courses by code for consistency
      coursesArr.sort((a, b) => a.code.localeCompare(b.code));

      facultyDocs.push({
        facultyId,
        name: instrData.name,
        email: instrData.email,
        phone: instrData.phone,
        department: 'Computer Science and Engineering',
        courses: coursesArr,
      });
    }

    // Sort by faculty ID for readable output
    facultyDocs.sort((a, b) => a.facultyId.localeCompare(b.facultyId));

    // ------------------------------------------------------------------
    // Step 5: Build timetable documents (one per day)
    // ------------------------------------------------------------------

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // timetableMap: day -> [ { time, room, courseCode, courseTitle, instructor, students: Set } ]
    const timetableMap = new Map();
    for (const day of dayOrder) {
      timetableMap.set(day, new Map()); // key = "time|room|courseCode" -> slot object
    }

    for (const student of students) {
      const courses = student.registeredCourses || [];
      for (const course of courses) {
        const scheduleArr = Array.isArray(course.schedule) ? course.schedule : [];
        for (const s of scheduleArr) {
          const parsed = parseScheduleString(s);
          if (!parsed) continue;

          const { day, time } = parsed;
          if (!timetableMap.has(day)) {
            timetableMap.set(day, new Map());
          }

          const slotKey = `${time}|${course.room || ''}|${course.code}`;
          const daySlots = timetableMap.get(day);

          if (!daySlots.has(slotKey)) {
            daySlots.set(slotKey, {
              time,
              room: course.room || '',
              courseCode: course.code,
              courseTitle: course.title || '',
              instructor: normaliseName(course.instructor),
              students: new Set(),
            });
          }
          daySlots.get(slotKey).students.add(student.rollNumber);
        }
      }
    }

    const timetableDocs = [];
    for (const day of dayOrder) {
      const daySlots = timetableMap.get(day);
      if (!daySlots || daySlots.size === 0) continue;

      const slots = [];
      for (const [, slot] of daySlots) {
        slots.push({
          time: slot.time,
          room: slot.room,
          courseCode: slot.courseCode,
          courseTitle: slot.courseTitle,
          instructor: slot.instructor,
          studentCount: slot.students.size,
        });
      }

      // Sort slots by time then course code
      slots.sort((a, b) => {
        const timeCmp = a.time.localeCompare(b.time);
        if (timeCmp !== 0) return timeCmp;
        return a.courseCode.localeCompare(b.courseCode);
      });

      timetableDocs.push({ day, slots });
    }

    // ------------------------------------------------------------------
    // Step 6: Build rooms documents
    // ------------------------------------------------------------------

    // roomMap: roomId -> { building, roomNumber, schedule: [ { day, time, courseCode, courseTitle, instructor } ] }
    const roomMap = new Map();

    for (const student of students) {
      const courses = student.registeredCourses || [];
      for (const course of courses) {
        const roomId = (course.room || '').trim();
        if (!roomId) continue;

        if (!roomMap.has(roomId)) {
          const { building, roomNumber } = parseRoom(roomId);
          roomMap.set(roomId, {
            roomId,
            building,
            roomNumber,
            scheduleSet: new Set(), // for dedup: "day|time|courseCode"
            schedule: [],
          });
        }

        const roomEntry = roomMap.get(roomId);
        const scheduleArr = Array.isArray(course.schedule) ? course.schedule : [];

        for (const s of scheduleArr) {
          const parsed = parseScheduleString(s);
          if (!parsed) continue;

          const dedupKey = `${parsed.day}|${parsed.time}|${course.code}`;
          if (!roomEntry.scheduleSet.has(dedupKey)) {
            roomEntry.scheduleSet.add(dedupKey);
            roomEntry.schedule.push({
              day: parsed.day,
              time: parsed.time,
              courseCode: course.code,
              courseTitle: course.title || '',
              instructor: normaliseName(course.instructor),
            });
          }
        }
      }
    }

    const roomsDocs = [];
    for (const [, roomData] of roomMap) {
      // Sort schedule by day order then time
      const dayIndex = {};
      dayOrder.forEach((d, i) => { dayIndex[d] = i; });

      roomData.schedule.sort((a, b) => {
        const dayDiff = (dayIndex[a.day] ?? 99) - (dayIndex[b.day] ?? 99);
        if (dayDiff !== 0) return dayDiff;
        return a.time.localeCompare(b.time);
      });

      roomsDocs.push({
        roomId: roomData.roomId,
        building: roomData.building,
        roomNumber: roomData.roomNumber,
        schedule: roomData.schedule,
      });
    }

    // Sort rooms by building then room number
    roomsDocs.sort((a, b) => {
      const bldgCmp = a.building.localeCompare(b.building);
      if (bldgCmp !== 0) return bldgCmp;
      return a.roomNumber.localeCompare(b.roomNumber);
    });

    // ------------------------------------------------------------------
    // Step 7: Drop and recreate collections
    // ------------------------------------------------------------------

    console.log('--- Dropping existing collections (faculty, timetable, rooms) ---');

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (collectionNames.includes('faculty')) {
      await db.collection('faculty').drop();
      console.log('  Dropped: faculty');
    }
    if (collectionNames.includes('timetable')) {
      await db.collection('timetable').drop();
      console.log('  Dropped: timetable');
    }
    if (collectionNames.includes('rooms')) {
      await db.collection('rooms').drop();
      console.log('  Dropped: rooms');
    }

    // ------------------------------------------------------------------
    // Step 8: Insert faculty documents
    // ------------------------------------------------------------------

    console.log('\n--- Inserting faculty collection ---');
    const facultyCollection = db.collection('faculty');

    for (const doc of facultyDocs) {
      await facultyCollection.updateOne(
        { facultyId: doc.facultyId },
        { $set: doc },
        { upsert: true }
      );
      const totalStudents = doc.courses.reduce((sum, c) => sum + c.enrolledStudents.length, 0);
      console.log(`  ${doc.facultyId}: ${doc.name} | ${doc.courses.length} course(s) | ${totalStudents} total enrollments`);
    }

    // Create index on facultyId
    await facultyCollection.createIndex({ facultyId: 1 }, { unique: true });
    console.log(`  Created unique index on facultyId`);

    // ------------------------------------------------------------------
    // Step 9: Insert timetable documents
    // ------------------------------------------------------------------

    console.log('\n--- Inserting timetable collection ---');
    const timetableCollection = db.collection('timetable');

    for (const doc of timetableDocs) {
      await timetableCollection.updateOne(
        { day: doc.day },
        { $set: doc },
        { upsert: true }
      );
      console.log(`  ${doc.day}: ${doc.slots.length} slot(s)`);
    }

    // Create index on day
    await timetableCollection.createIndex({ day: 1 }, { unique: true });
    console.log(`  Created unique index on day`);

    // ------------------------------------------------------------------
    // Step 10: Insert rooms documents
    // ------------------------------------------------------------------

    console.log('\n--- Inserting rooms collection ---');
    const roomsCollection = db.collection('rooms');

    for (const doc of roomsDocs) {
      await roomsCollection.updateOne(
        { roomId: doc.roomId },
        { $set: doc },
        { upsert: true }
      );
      console.log(`  ${doc.roomId}: ${doc.schedule.length} scheduled slot(s)`);
    }

    // Create index on roomId
    await roomsCollection.createIndex({ roomId: 1 }, { unique: true });
    console.log(`  Created unique index on roomId`);

    // ------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------

    const facultyCount = await facultyCollection.countDocuments();
    const timetableCount = await timetableCollection.countDocuments();
    const roomsCount = await roomsCollection.countDocuments();

    console.log('\n========================================');
    console.log('  SEED SUMMARY');
    console.log('========================================');
    console.log(`  Student records read:    ${students.length}`);
    console.log(`  Faculty docs created:    ${facultyCount}`);
    console.log(`  Timetable docs created:  ${timetableCount} (one per day)`);
    console.log(`  Rooms docs created:      ${roomsCount}`);
    console.log('========================================');

    // Show faculty mapping
    console.log('\n  Faculty ID Mappings:');
    for (const doc of facultyDocs) {
      const courseList = doc.courses.map(c => c.code).join(', ');
      console.log(`    ${doc.facultyId} -> ${doc.name} [${courseList}]`);
    }

    // Show timetable summary
    console.log('\n  Timetable Summary:');
    for (const doc of timetableDocs) {
      const totalStudents = doc.slots.reduce((sum, s) => sum + s.studentCount, 0);
      console.log(`    ${doc.day}: ${doc.slots.length} slots, ${totalStudents} total student-slots`);
    }

    // Show rooms summary
    console.log('\n  Rooms Summary:');
    for (const doc of roomsDocs) {
      console.log(`    ${doc.roomId} (${doc.building} / ${doc.roomNumber}): ${doc.schedule.length} slots`);
    }

    console.log('\nDone! Collections student, faculty, timetable, rooms are all in the "student" database.');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

seed();
