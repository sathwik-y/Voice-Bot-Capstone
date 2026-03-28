const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'auth.db');
const db = new Database(dbPath);

console.log('=== Users in Database ===');
const users = db.prepare('SELECT id, rollNumber, createdAt FROM users').all();
console.log(users);

console.log('\n=== Recent Conversations ===');
const conversations = db.prepare('SELECT * FROM conversations ORDER BY createdAt DESC LIMIT 5').all();
console.log(conversations);

db.close();
