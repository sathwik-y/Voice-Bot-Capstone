-- User authentication table with RBAC
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rollNumber TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'faculty', 'admin')),
  password TEXT NOT NULL,
  phoneNumber TEXT DEFAULT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index on rollNumber for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_rollNumber ON users(rollNumber);

-- Conversation history table
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  intent TEXT DEFAULT 'unknown',
  confidence REAL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Index on userId for fast user conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations(userId);

-- Query analytics table
CREATE TABLE IF NOT EXISTS query_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  intent TEXT NOT NULL,
  confidence REAL NOT NULL,
  responseTimeMs INTEGER DEFAULT 0,
  source TEXT DEFAULT 'text' CHECK(source IN ('voice', 'text', 'phone')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_intent ON query_analytics(intent);
CREATE INDEX IF NOT EXISTS idx_analytics_createdAt ON query_analytics(createdAt);
