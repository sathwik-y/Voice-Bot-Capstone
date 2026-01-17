import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
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
  const dbPath = join(process.cwd(), 'data', 'auth.db');

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
