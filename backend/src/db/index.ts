import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

const dbPath = process.env.DATABASE_PATH || './data/sms.db';

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize schema
export function initializeDatabase() {
  try {
    // Create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
        content TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('received', 'processing', 'sent', 'failed')),
        twilio_message_id TEXT UNIQUE,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS message_states (
        twilio_message_id TEXT PRIMARY KEY,
        processed INTEGER NOT NULL DEFAULT 0,
        message_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS dlq_messages (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        failed_attempts INTEGER NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_twilio_id ON messages(twilio_message_id);
      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
      CREATE INDEX IF NOT EXISTS idx_message_states_message_id ON message_states(message_id);
      CREATE INDEX IF NOT EXISTS idx_dlq_messages_message_id ON dlq_messages(message_id);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function closeDatabase() {
  sqlite.close();
}
