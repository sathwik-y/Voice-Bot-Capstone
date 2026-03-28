import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

let db: Database.Database | null = null;

/**
 * Get or initialize the SQLite database connection
 */
export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  // Create data directory if it doesn't exist
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, 'auth.db');

  // Initialize database
  db = new Database(dbPath);

  // Run schema initialization
  const schemaPath = join(process.cwd(), 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Run migrations for existing databases
  migrateDatabase(db);

  return db;
}

/**
 * Migrate existing database to new schema
 */
function migrateDatabase(database: Database.Database): void {
  // Check if 'role' column exists in users table
  const columns = database.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('role')) {
    database.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
  }

  if (!columnNames.includes('name')) {
    database.exec("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  }

  if (!columnNames.includes('phoneNumber')) {
    database.exec("ALTER TABLE users ADD COLUMN phoneNumber TEXT DEFAULT NULL");
  }

  // Check conversations table for new columns
  const convColumns = database.prepare("PRAGMA table_info(conversations)").all() as { name: string }[];
  const convColumnNames = convColumns.map(c => c.name);

  if (!convColumnNames.includes('intent')) {
    database.exec("ALTER TABLE conversations ADD COLUMN intent TEXT DEFAULT 'unknown'");
  }

  if (!convColumnNames.includes('confidence')) {
    database.exec("ALTER TABLE conversations ADD COLUMN confidence REAL DEFAULT 0");
  }
}

/**
 * Execute a SELECT query and return all results
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 */
export function run(sql: string, params: any[] = []): Database.RunResult {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.run(...params);
}

/**
 * Execute a SELECT query and return the first result
 */
export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.get(...params) as T | undefined;
}
