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

  return db;
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
