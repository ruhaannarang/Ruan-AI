import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory resides in server/data/
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ruan_auth.db');

/**
 * Singleton SQLite database connection for Ruan AI authentication and user profiles.
 * Configured with Write-Ahead Logging (WAL) for high-performance concurrent reads/writes
 * and strict foreign key integrity.
 */
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);

    // Performance & integrity pragmas
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('synchronous = NORMAL');

    initializeSchema(dbInstance);
  }
  return dbInstance;
}

/**
 * Initializes the database schema with parameterized tables and indices.
 * 
 * @param {import('better-sqlite3').Database} db 
 */
function initializeSchema(db) {
  // Users table storing canonical Google identities
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
