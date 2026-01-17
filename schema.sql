-- User authentication table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rollNumber TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index on rollNumber for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_rollNumber ON users(rollNumber);
