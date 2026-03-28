/**
 * Seed local SQLite database with test users for all roles.
 * Usage: node scripts/seed-users.js
 */

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const { readFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const SALT_ROUNDS = 10;
const PASSWORD = 'password123'; // Default password for all test users

async function seed() {
  // Setup database
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const db = new Database(join(dataDir, 'auth.db'));
  const schema = readFileSync(join(process.cwd(), 'schema.sql'), 'utf-8');
  db.exec(schema);

  // Run migrations
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = columns.map(c => c.name);
  if (!columnNames.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
  }
  if (!columnNames.includes('name')) {
    db.exec("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  }
  if (!columnNames.includes('phoneNumber')) {
    db.exec("ALTER TABLE users ADD COLUMN phoneNumber TEXT DEFAULT NULL");
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const users = [
    // Students (with phone numbers for Ringg AI caller-ID auth)
    { rollNumber: 'VU22CSEN0101112', name: 'Y Sathwik', role: 'student', phoneNumber: '9876543200' },
    { rollNumber: 'VU22CSEN0102342', name: 'B Sai Vardhan', role: 'student', phoneNumber: '9876543201' },
    { rollNumber: 'VU22CSEN0101727', name: 'N Samuel Ricky', role: 'student', phoneNumber: '9876543202' },
    { rollNumber: 'VU22CSEN0101391', name: 'G Srivatsa', role: 'student', phoneNumber: '9876543203' },
    { rollNumber: 'VU22CSEN0100201', name: 'Aditya Sharma', role: 'student', phoneNumber: '9876543204' },
    { rollNumber: 'VU22CSEN0100305', name: 'Priya Reddy', role: 'student', phoneNumber: '9876543205' },
    { rollNumber: 'VU22CSEN0100412', name: 'Rahul Verma', role: 'student', phoneNumber: '9876543206' },
    { rollNumber: 'VU22CSEN0100518', name: 'Sneha Patel', role: 'student', phoneNumber: '9876543207' },
    { rollNumber: 'VU22CSEN0100623', name: 'Vikram Singh', role: 'student', phoneNumber: '9876543208' },
    { rollNumber: 'VU22CSEN0100734', name: 'Ananya Iyer', role: 'student', phoneNumber: '9876543209' },
    { rollNumber: 'VU22CSEN0100845', name: 'Karthik Nair', role: 'student', phoneNumber: '9876543210' },
    { rollNumber: 'VU22CSEN0100956', name: 'Divya Prasad', role: 'student', phoneNumber: '9876543211' },
    { rollNumber: 'VU22CSEN0101067', name: 'Arjun Menon', role: 'student', phoneNumber: '9876543212' },
    { rollNumber: 'VU22CSEN0101178', name: 'Meera Krishnan', role: 'student', phoneNumber: '9876543213' },
    { rollNumber: 'VU22CSEN0101289', name: 'Rohan Das', role: 'student', phoneNumber: '9876543214' },
    { rollNumber: 'VU22CSEN0101401', name: 'Nikhil Joshi', role: 'student', phoneNumber: '9876543215' },

    // Faculty
    { rollNumber: 'FAC001', name: 'Dr. Murali Krishna M.', role: 'faculty', phoneNumber: '9876500001' },
    { rollNumber: 'FAC002', name: 'Prof. Lakshmi Narayana K.', role: 'faculty', phoneNumber: '9876500002' },
    { rollNumber: 'FAC003', name: 'Dr. Ravi Shankar P.', role: 'faculty', phoneNumber: '9876500003' },

    // Admin
    { rollNumber: 'ADMIN001', name: 'System Administrator', role: 'admin', phoneNumber: '9876500000' },
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO users (rollNumber, password, name, role, phoneNumber) VALUES (?, ?, ?, ?, ?)');
  const update = db.prepare('UPDATE users SET name = ?, role = ?, password = ?, phoneNumber = ? WHERE rollNumber = ?');

  let created = 0;
  let updated = 0;

  for (const user of users) {
    const existing = db.prepare('SELECT id FROM users WHERE rollNumber = ?').get(user.rollNumber);

    if (existing) {
      update.run(user.name, user.role, hashedPassword, user.phoneNumber || null, user.rollNumber);
      updated++;
      console.log(`  ~ Updated: ${user.rollNumber} (${user.name}) [${user.role}] phone: ${user.phoneNumber || 'none'}`);
    } else {
      insert.run(user.rollNumber, hashedPassword, user.name, user.role, user.phoneNumber || null);
      created++;
      console.log(`  + Created: ${user.rollNumber} (${user.name}) [${user.role}] phone: ${user.phoneNumber || 'none'}`);
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}`);
  console.log(`\nAll users have password: ${PASSWORD}`);
  console.log('\nTest accounts:');
  console.log('  Student:  VU22CSEN0101112 / password123  (phone: 9876543200)');
  console.log('  Faculty:  FAC001 / password123');
  console.log('  Admin:    ADMIN001 / password123');

  // Show all users
  const allUsers = db.prepare('SELECT rollNumber, name, role, phoneNumber FROM users ORDER BY role, rollNumber').all();
  console.log(`\nAll users in database (${allUsers.length}):`);
  allUsers.forEach(u => console.log(`  ${u.role.padEnd(8)} ${u.rollNumber.padEnd(20)} ${u.name.padEnd(25)} ${u.phoneNumber || '-'}`));

  db.close();
}

seed().catch(console.error);
