/**
 * MongoDB Seed Script - Populates the database with realistic student data
 * matching the EXACT schema of the existing MongoDB records.
 *
 * Usage: node scripts/seed-mongodb.js
 *
 * Database: "student", Collection: "student"
 * SKIPS VU22CSEN0101112 (Y Sathwik) to preserve the original record.
 */

const { MongoClient } = require('mongodb');

// Load from .env.local if dotenv is available, otherwise use env vars
try { require('dotenv').config({ path: '.env.local' }); } catch {}

const MONGO_URI = process.env.MONGODB_URI || (() => {
  console.error('ERROR: MONGODB_URI not set. Add it to .env.local');
  process.exit(1);
})();
const DB_NAME = 'student';
const COLLECTION_NAME = 'student';

// ---------------------------------------------------------------------------
// Pools of realistic data
// ---------------------------------------------------------------------------

const gradeScale = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'];
const gradePoints = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0 };

const creditCategories = ['UC', 'UC-Basket(P/F)', 'UC-MooC(P/F)', 'FC', 'FC(P/F)', 'PC', 'PE', 'OE', 'MI', 'Total'];

const facultyPool = [
  { id: '502089', name: 'Sekharamahanti S Nandini', phone: '9703537105', email: 'ssekhara@gitam.edu' },
  { id: '502134', name: 'Dr. Murali Krishna M', phone: '9876543210', email: 'mmurali@gitam.edu' },
  { id: '502201', name: 'Prof. Lakshmi Narayana K', phone: '9845612378', email: 'klakshmi@gitam.edu' },
  { id: '502278', name: 'Dr. Ravi Shankar P', phone: '9701234567', email: 'pravi@gitam.edu' },
  { id: '502315', name: 'Prof. Anitha Kumari S', phone: '9856741230', email: 'sanitha@gitam.edu' },
  { id: '502342', name: 'Dr. Venkat Reddy B', phone: '9823456781', email: 'bvenkat@gitam.edu' },
  { id: '502389', name: 'Prof. Srinivas Rao T', phone: '9812345670', email: 'tsrinivas@gitam.edu' },
  { id: '502401', name: 'Dr. Padma Priya G', phone: '9798765432', email: 'gpadma@gitam.edu' },
  { id: '502456', name: 'Prof. Ramesh Babu N', phone: '9787654321', email: 'nramesh@gitam.edu' },
  { id: '502478', name: 'Dr. Kavitha Devi M', phone: '9776543210', email: 'mkavitha@gitam.edu' },
  { id: '502512', name: 'Prof. Suresh Kumar D', phone: '9765432109', email: 'dsuresh@gitam.edu' },
  { id: '502534', name: 'Dr. Swathi Lakshmi R', phone: '9754321098', email: 'rswathi@gitam.edu' },
  { id: '502567', name: 'Dr. Anil Kumar Ch', phone: '9743210987', email: 'chanil@gitam.edu' },
  { id: '502589', name: 'Prof. Deepika Sharma A', phone: '9732109876', email: 'adeepika@gitam.edu' },
  { id: '502612', name: 'Dr. Raghu Ram K', phone: '9721098765', email: 'kraghu@gitam.edu' },
  { id: '502634', name: 'Prof. Harish Chandra V', phone: '9710987654', email: 'vharish@gitam.edu' },
  { id: '502656', name: 'Dr. Meena Kumari P', phone: '9698765432', email: 'pmeena@gitam.edu' },
  { id: '502678', name: 'Prof. Rajesh Kumar S', phone: '9687654321', email: 'srajesh@gitam.edu' },
];

// Semester 7 courses (current semester)
const sem7CoursePool = [
  { code: '24CSEN2371', name: 'Advanced Coding', title: 'Advanced Coding', room: 'ICT / 519', credits: 3, type: 'T', category: 'PE' },
  { code: 'CSEN3161', name: 'Advanced Operating Systems', title: 'Advanced Operating Systems', room: 'ICT / 302', credits: 4, type: 'T', category: 'PE' },
  { code: 'CSEN3241', name: 'Machine Learning', title: 'Machine Learning', room: 'ICT / 415', credits: 4, type: 'T', category: 'PC' },
  { code: '24CSEN2381', name: 'Social Network Analysis', title: 'Social Network Analysis', room: 'ICT / 210', credits: 3, type: 'T', category: 'OE' },
  { code: 'CSEN4011', name: 'Cloud Computing', title: 'Cloud Computing', room: 'ICT / 318', credits: 3, type: 'T', category: 'PE' },
  { code: 'CSEN4021', name: 'Deep Learning', title: 'Deep Learning', room: 'ICT / 420', credits: 4, type: 'T', category: 'PE' },
  { code: 'CSEN3251', name: 'Cyber Security', title: 'Cyber Security', room: 'ICT / 511', credits: 3, type: 'T', category: 'OE' },
  { code: '24CSEN2391', name: 'Natural Language Processing', title: 'Natural Language Processing', room: 'ICT / 405', credits: 3, type: 'T', category: 'PE' },
  { code: 'CSEN4031', name: 'Blockchain Technology', title: 'Blockchain Technology', room: 'ICT / 312', credits: 3, type: 'T', category: 'OE' },
  { code: 'CSEN4041', name: 'Internet of Things', title: 'Internet of Things', room: 'ICT / 208', credits: 3, type: 'T', category: 'OE' },
  { code: '24CSEN2401', name: 'Computer Vision', title: 'Computer Vision', room: 'ICT / 502', credits: 3, type: 'T', category: 'PE' },
  { code: 'CSEN3271', name: 'Data Mining', title: 'Data Mining', room: 'ICT / 316', credits: 3, type: 'T', category: 'OE' },
  { code: '24CSEN2411', name: 'Soft Computing', title: 'Soft Computing', room: 'ICT / 409', credits: 3, type: 'T', category: 'PE' },
  { code: 'GZEN1011', name: 'Universal Human Values', title: 'Universal Human Values', room: 'LH / 102', credits: 2, type: 'T', category: 'UC' },
];

// Earlier semester courses for courseStructure
const semesterCourses = {
  '1': [
    { code: 'CSEN1011', name: 'Problem Solving and Programming in C', type: 'P', category: 'FC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN1021', name: 'Computer Organization', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 4 },
    { code: 'MATH1011', name: 'Engineering Mathematics - I', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 4 },
    { code: 'PHYS1011', name: 'Engineering Physics', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 3 },
    { code: 'ENGL1011', name: 'Communicative English', type: 'T', category: 'UC', audit: 'Credits will be counted', credits: 2 },
    { code: 'CSEN1031', name: 'Digital Logic Design', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 3 },
  ],
  '2': [
    { code: 'CSEN1041', name: 'Data Structures', type: 'P', category: 'FC', audit: 'Credits will be counted', credits: 4 },
    { code: 'CSEN1051', name: 'Object Oriented Programming', type: 'P', category: 'FC', audit: 'Credits will be counted', credits: 3 },
    { code: 'MATH1021', name: 'Engineering Mathematics - II', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 4 },
    { code: 'CHEM1011', name: 'Engineering Chemistry', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 3 },
    { code: 'ENGL1021', name: 'Professional Communication', type: 'T', category: 'UC', audit: 'Credits will be counted', credits: 2 },
  ],
  '3': [
    { code: 'CSEN2011', name: 'Database Management Systems', type: 'P', category: 'PC', audit: 'Credits will be counted', credits: 4 },
    { code: 'CSEN2021', name: 'Computer Networks', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 4 },
    { code: 'CSEN2031', name: 'Operating Systems', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 4 },
    { code: 'MATH2011', name: 'Discrete Mathematics', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN2041', name: 'Design and Analysis of Algorithms', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 4 },
  ],
  '4': [
    { code: 'CSEN2051', name: 'Theory of Computation', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN2061', name: 'Software Engineering', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN2071', name: 'Compiler Design', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 4 },
    { code: 'MATH2021', name: 'Probability and Statistics', type: 'T', category: 'FC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN2081', name: 'Web Technologies', type: 'P', category: 'PC', audit: 'Credits will be counted', credits: 3 },
    { code: 'MGMT2011', name: 'Engineering Economics', type: 'T', category: 'UC', audit: 'Credits will be counted', credits: 2 },
  ],
  '5': [
    { code: 'CSEN3011', name: 'Artificial Intelligence', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 4 },
    { code: 'CSEN3021', name: 'Computer Graphics', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN3031', name: 'Information Security', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN3041', name: 'Distributed Systems', type: 'T', category: 'PE', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN3051', name: 'Mobile App Development', type: 'P', category: 'OE', audit: 'Credits will be counted', credits: 3 },
  ],
  '6': [
    { code: 'CSEN3061', name: 'Big Data Analytics', type: 'T', category: 'PE', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN3071', name: 'Parallel Computing', type: 'T', category: 'PE', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN3081', name: 'Human Computer Interaction', type: 'T', category: 'OE', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN3091', name: 'Software Testing', type: 'T', category: 'PC', audit: 'Credits will be counted', credits: 3 },
    { code: 'CSEN3101', name: 'Data Warehousing', type: 'T', category: 'OE', audit: 'Credits will be counted', credits: 3 },
    { code: 'MGMT3011', name: 'Entrepreneurship', type: 'T', category: 'UC', audit: 'Credits will be counted', credits: 2 },
  ],
};

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = [
  '09:00:00 - 09:50:00',
  '10:00:00 - 10:50:00',
  '11:00:00 - 11:50:00',
  '12:00:00 - 12:50:00',
  '14:00:00 - 14:50:00',
  '15:00:00 - 15:50:00',
  '16:00:00 - 16:50:00',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateGrade(bias) {
  // bias: 'high' -> skews to O/A+/A, 'mid' -> B+/A range, 'low' -> B/C range
  const weights = {
    high: [0.30, 0.30, 0.20, 0.10, 0.05, 0.03, 0.02, 0.00],
    mid:  [0.10, 0.20, 0.25, 0.20, 0.15, 0.05, 0.05, 0.00],
    low:  [0.05, 0.10, 0.15, 0.20, 0.25, 0.15, 0.08, 0.02],
  };
  const w = weights[bias] || weights.mid;
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < w.length; i++) {
    cumulative += w[i];
    if (r <= cumulative) return gradeScale[i];
  }
  return 'B+';
}

function generateSchedule(credits) {
  const numSlots = Math.min(credits, 3);
  const days = pickRandom(dayNames, numSlots);
  return days.map(d => `${d}: ${pickOne(timeSlots)}`);
}

function computeSgpa(grades, courses) {
  let totalPoints = 0;
  let totalCredits = 0;
  for (let i = 0; i < grades.length; i++) {
    const cr = courses[i]?.credits || 3;
    const gp = gradePoints[grades[i]] || 0;
    totalPoints += gp * cr;
    totalCredits += cr;
  }
  return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
}

// ---------------------------------------------------------------------------
// Student generator
// ---------------------------------------------------------------------------

function generateStudent(rollNumber, name, email, performanceBias) {
  const currentSemester = 7;

  // Pick 6-9 courses for current semester
  const numCourses = randomInt(6, 9);
  const selectedSem7Courses = pickRandom(sem7CoursePool, numCourses);
  const selectedFaculty = pickRandom(facultyPool, numCourses);

  // currentSemesterCourses
  const currentSemesterCourses = selectedSem7Courses.map(c => ({
    code: c.code,
    name: c.name,
  }));

  // registeredCourses
  const registeredCourses = selectedSem7Courses.map((c, i) => ({
    code: c.code,
    title: c.title,
    room: c.room,
    credits: c.credits,
    type: c.type,
    category: c.category,
    instructor: selectedFaculty[i].name,
    schedule: generateSchedule(c.credits),
  }));

  // faculty map
  const faculty = {};
  selectedSem7Courses.forEach((c, i) => {
    faculty[c.code] = {
      id: selectedFaculty[i].id,
      name: selectedFaculty[i].name,
      phone: selectedFaculty[i].phone,
      email: selectedFaculty[i].email,
    };
  });

  // attendance
  const attendance = selectedSem7Courses.map((c, i) => {
    const total = randomInt(18, 30);
    const pct = randomInt(60, 98);
    const present = Math.round(total * pct / 100);
    return {
      code: c.code,
      name: c.name,
      present,
      totalClassesTaken: total,
      percentage: pct,
    };
  });

  // credits
  const totalRequired =               [12, 2, 10, 57, 7, 52, 15, 24, 0, 160];
  const acquiredBase =                 [12, 0,  8, 46, 4, 52,  9, 15, 0, 134];
  const registeredCurrentSemesterBase = [0, 0,  0,  5, 2,  0,  6,  6, 0,  17];

  // Vary acquired credits slightly per student
  const acquired = acquiredBase.map((v, idx) => {
    if (idx === acquiredBase.length - 1) return 0; // will compute total
    const variation = randomInt(-3, 3);
    return Math.max(0, Math.min(v + variation, totalRequired[idx]));
  });
  acquired[acquired.length - 1] = acquired.slice(0, -1).reduce((a, b) => a + b, 0);

  const registeredCurrentSemester = registeredCurrentSemesterBase.map((v, idx) => {
    if (idx === registeredCurrentSemesterBase.length - 1) return 0;
    const variation = randomInt(-1, 1);
    return Math.max(0, v + variation);
  });
  registeredCurrentSemester[registeredCurrentSemester.length - 1] = registeredCurrentSemester.slice(0, -1).reduce((a, b) => a + b, 0);

  const pending = totalRequired.map((req, idx) => {
    if (idx === totalRequired.length - 1) return 0;
    const p = req - acquired[idx] - registeredCurrentSemester[idx];
    return Math.max(0, p);
  });
  pending[pending.length - 1] = pending.slice(0, -1).reduce((a, b) => a + b, 0);

  const failedArr = totalRequired.map(() => 0);
  const resultAwaiting = totalRequired.map(() => 0);

  const credits = {
    categories: creditCategories,
    totalRequired,
    acquiredTillDate: acquired,
    failedCourses: failedArr,
    resultsAwaiting: resultAwaiting,
    registeredCurrentSemester,
    pending,
  };

  // courseStructure - semesters 1-6
  const courseStructure = { semesters: {} };
  for (let sem = 1; sem <= 6; sem++) {
    courseStructure.semesters[String(sem)] = semesterCourses[String(sem)].map(c => ({
      code: c.code,
      name: c.name,
      type: c.type,
      category: c.category,
      audit: c.audit,
      credits: c.credits,
    }));
  }
  // Also add sem 7
  courseStructure.semesters['7'] = selectedSem7Courses.map(c => ({
    code: c.code,
    name: c.title,
    type: c.type,
    category: c.category,
    audit: 'Credits will be counted',
    credits: c.credits,
  }));

  // grades - semesters 1-5 (6 results awaiting for some, keep 1-5 solid)
  const grades = { semesters: {} };
  let prevCgpa = 0;
  let totalCreditsSoFar = 0;
  let totalGradePointsSoFar = 0;

  for (let sem = 1; sem <= 5; sem++) {
    const semCourses = semesterCourses[String(sem)];
    const semGrades = semCourses.map(() => generateGrade(performanceBias));
    const sgpa = computeSgpa(semGrades, semCourses);

    // Compute running CGPA
    let semCredits = 0;
    let semPoints = 0;
    semGrades.forEach((g, i) => {
      const cr = semCourses[i].credits;
      semCredits += cr;
      semPoints += (gradePoints[g] || 0) * cr;
    });
    totalCreditsSoFar += semCredits;
    totalGradePointsSoFar += semPoints;
    const cgpa = parseFloat((totalGradePointsSoFar / totalCreditsSoFar).toFixed(2));

    const endGrades = semCourses.map((c, i) => ({
      subject: c.name,
      grade: semGrades[i],
    }));

    const internalMarks = semCourses.map((c, i) => ({
      code: c.code,
      ce: randomInt(55, 98),
      re: semGrades[i] === 'F' ? randomInt(10, 35) : null,
    }));

    grades.semesters[String(sem)] = {
      endGrades,
      sgpa,
      cgpa,
      internalMarks,
    };

    prevCgpa = cgpa;
  }

  // Semester 6 grades (also available)
  {
    const sem = 6;
    const semCourses = semesterCourses[String(sem)];
    const semGrades = semCourses.map(() => generateGrade(performanceBias));
    const sgpa = computeSgpa(semGrades, semCourses);

    let semCredits = 0;
    let semPoints = 0;
    semGrades.forEach((g, i) => {
      const cr = semCourses[i].credits;
      semCredits += cr;
      semPoints += (gradePoints[g] || 0) * cr;
    });
    totalCreditsSoFar += semCredits;
    totalGradePointsSoFar += semPoints;
    const cgpa = parseFloat((totalGradePointsSoFar / totalCreditsSoFar).toFixed(2));

    grades.semesters['6'] = {
      endGrades: semCourses.map((c, i) => ({ subject: c.name, grade: semGrades[i] })),
      sgpa,
      cgpa,
      internalMarks: semCourses.map((c, i) => ({
        code: c.code,
        ce: randomInt(55, 98),
        re: semGrades[i] === 'F' ? randomInt(10, 35) : null,
      })),
    };
  }

  return {
    rollNumber,
    name,
    email,
    currentSemester,
    currentSemesterCourses,
    registeredCourses,
    faculty,
    attendance,
    credits,
    courseStructure,
    grades,
  };
}

// ---------------------------------------------------------------------------
// Student list (15 new students - SKIPPING VU22CSEN0101112)
// ---------------------------------------------------------------------------

const studentsToSeed = [
  { roll: 'VU22CSEN0102342', name: 'B Sai Vardhan',    email: 'bsaivar@gitam.in',     bias: 'high' },
  { roll: 'VU22CSEN0101727', name: 'N Samuel Ricky',   email: 'nsamuel@gitam.in',      bias: 'mid' },
  { roll: 'VU22CSEN0101391', name: 'G Srivatsa',       email: 'gsrivat@gitam.in',      bias: 'high' },
  { roll: 'VU22CSEN0100201', name: 'Aditya Sharma',    email: 'asharma@gitam.in',      bias: 'mid' },
  { roll: 'VU22CSEN0100305', name: 'Priya Reddy',      email: 'preddy@gitam.in',       bias: 'high' },
  { roll: 'VU22CSEN0100412', name: 'Rahul Verma',      email: 'rverma@gitam.in',       bias: 'mid' },
  { roll: 'VU22CSEN0100518', name: 'Sneha Patel',      email: 'spatel@gitam.in',       bias: 'high' },
  { roll: 'VU22CSEN0100623', name: 'Vikram Singh',     email: 'vsingh@gitam.in',       bias: 'low' },
  { roll: 'VU22CSEN0100734', name: 'Ananya Iyer',      email: 'aiyer@gitam.in',        bias: 'high' },
  { roll: 'VU22CSEN0100845', name: 'Karthik Nair',     email: 'knair@gitam.in',        bias: 'mid' },
  { roll: 'VU22CSEN0100956', name: 'Divya Prasad',     email: 'dprasad@gitam.in',      bias: 'mid' },
  { roll: 'VU22CSEN0101067', name: 'Arjun Menon',      email: 'amenon@gitam.in',       bias: 'low' },
  { roll: 'VU22CSEN0101178', name: 'Meera Krishnan',   email: 'mkrishn@gitam.in',      bias: 'high' },
  { roll: 'VU22CSEN0101289', name: 'Rohan Das',        email: 'rdas@gitam.in',         bias: 'mid' },
  { roll: 'VU22CSEN0101401', name: 'Nikhil Joshi',     email: 'njoshi@gitam.in',       bias: 'low' },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Check existing data
    const existingCount = await collection.countDocuments();
    console.log(`Existing records in ${DB_NAME}.${COLLECTION_NAME}: ${existingCount}`);

    const existing = await collection.findOne({ rollNumber: 'VU22CSEN0101112' });
    if (existing) {
      console.log('Found existing record for VU22CSEN0101112 (Y Sathwik) - will NOT modify it.');
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const s of studentsToSeed) {
      // Extra safety: skip the original record
      if (s.roll === 'VU22CSEN0101112') {
        console.log(`  SKIP: ${s.roll} (${s.name}) - original record preserved`);
        skipped++;
        continue;
      }

      const studentDoc = generateStudent(s.roll, s.name, s.email, s.bias);

      const result = await collection.updateOne(
        { rollNumber: s.roll },
        { $set: studentDoc },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        inserted++;
        console.log(`  + Inserted: ${s.roll} (${s.name})`);
      } else if (result.modifiedCount > 0) {
        updated++;
        console.log(`  ~ Updated: ${s.roll} (${s.name})`);
      } else {
        console.log(`  = Unchanged: ${s.roll} (${s.name})`);
      }
    }

    console.log(`\nSeed complete! Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

    // Verify
    const finalCount = await collection.countDocuments();
    console.log(`Total records in ${DB_NAME}.${COLLECTION_NAME}: ${finalCount}`);

    // Show a sample record to verify schema
    const sample = await collection.findOne({ rollNumber: 'VU22CSEN0102342' });
    if (sample) {
      console.log('\n--- Sample record (VU22CSEN0102342 - B Sai Vardhan) ---');
      console.log(`  rollNumber: ${sample.rollNumber}`);
      console.log(`  name: ${sample.name}`);
      console.log(`  email: ${sample.email}`);
      console.log(`  currentSemester: ${sample.currentSemester}`);
      console.log(`  currentSemesterCourses: ${sample.currentSemesterCourses?.length} courses`);
      console.log(`  registeredCourses: ${sample.registeredCourses?.length} courses`);
      console.log(`  faculty keys: ${Object.keys(sample.faculty || {}).join(', ')}`);
      console.log(`  attendance: ${sample.attendance?.length} entries`);
      console.log(`  credits.categories: ${sample.credits?.categories?.length} categories`);
      console.log(`  courseStructure semesters: ${Object.keys(sample.courseStructure?.semesters || {}).join(', ')}`);
      console.log(`  grades semesters: ${Object.keys(sample.grades?.semesters || {}).join(', ')}`);

      // Show one semester of grades
      const sem1Grades = sample.grades?.semesters?.['1'];
      if (sem1Grades) {
        console.log(`\n  Semester 1 SGPA: ${sem1Grades.sgpa}, CGPA: ${sem1Grades.cgpa}`);
        console.log(`  Semester 1 endGrades: ${sem1Grades.endGrades?.map(g => `${g.subject}: ${g.grade}`).join(', ')}`);
      }
    }

    // Also verify original is untouched
    const original = await collection.findOne({ rollNumber: 'VU22CSEN0101112' });
    if (original) {
      console.log('\n--- Original record (VU22CSEN0101112 - Y Sathwik) verified ---');
      console.log(`  name: ${original.name}`);
      console.log(`  email: ${original.email}`);
      console.log(`  currentSemester: ${original.currentSemester}`);
      console.log(`  Courses: ${original.currentSemesterCourses?.length || 'N/A'}`);
    }

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

seed();
