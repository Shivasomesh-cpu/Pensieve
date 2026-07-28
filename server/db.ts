import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
const SQL_WASM_PATH = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

let dbInstance: Database | null = null;

function getDbFilePath(): string {
  const isVercel = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
  const baseDir = isVercel ? os.tmpdir() : process.cwd();
  return path.join(baseDir, 'pensieve.sqlite');
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  
  const DB_FILE = getDbFilePath();
  const SQL = await initSqlJs({ locateFile: () => SQL_WASM_PATH });
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }
  
  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  const DB_FILE = getDbFilePath();
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  try {
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.warn('Could not write database file to disk:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'note',
      is_ghost INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      share_token TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      note_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (note_id, tag),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_title TEXT NOT NULL,
      PRIMARY KEY (source_id, target_id),
      FOREIGN KEY (source_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  // Seed default notes if table is empty
  const res = db.exec("SELECT COUNT(*) as cnt FROM notes");
  const count = res[0] && res[0].values[0] ? (res[0].values[0][0] as number) : 0;
  
  if (count === 0) {
    seedInitialData(db);
  }
}

export function queryAll<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(db: Database, sql: string, params: any[] = []): T | null {
  const list = queryAll<T>(db, sql, params);
  return list.length > 0 ? list[0] : null;
}

export function runQuery(db: Database, sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}

function seedInitialData(db: Database) {
  // Clean canvas by default - no fake notes
}

export function clearAllNotes(db: Database) {
  db.run(`DELETE FROM links`);
  db.run(`DELETE FROM tags`);
  db.run(`DELETE FROM notes`);
  saveDb();
}

export function processBacklinksForNote(db: Database, sourceId: string, sourceTitle: string, content: string) {
  // Remove existing links for this source
  db.run(`DELETE FROM links WHERE source_id = ?`, [sourceId]);

  // Extract [[Title]] wikilinks
  const wikiRegex = /\[\[(.*?)\]\]/g;
  const matches = new Set<string>();
  let match;
  while ((match = wikiRegex.exec(content)) !== null) {
    const rawTitle = match[1].trim();
    if (rawTitle && rawTitle !== sourceTitle) {
      matches.add(rawTitle);
    }
  }

  const now = new Date().toISOString();

  for (const targetTitle of matches) {
    // Find if target note exists
    let targetNote = queryOne<{ id: string; title: string }>(
      db,
      `SELECT id, title FROM notes WHERE LOWER(title) = LOWER(?)`,
      [targetTitle]
    );

    let targetId: string;

    if (!targetNote) {
      // Create lightweight ghost note!
      targetId = 'ghost-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      db.run(
        `INSERT INTO notes (id, title, content, type, is_ghost, is_pinned, is_archived, is_public, created_at, updated_at)
         VALUES (?, ?, ?, 'ghost', 1, 0, 0, 0, ?, ?)`,
        [
          targetId,
          targetTitle,
          `*This is a ghost note created from a backlink in [[${sourceTitle}]]. Click to edit and bring this concept to life.*`,
          now,
          now
        ]
      );
      // Auto tag ghost
      db.run(`INSERT INTO tags (note_id, tag) VALUES (?, 'ghost')`, [targetId]);
    } else {
      targetId = targetNote.id;
    }

    // Insert edge into links table
    db.run(
      `INSERT OR IGNORE INTO links (source_id, target_id, target_title) VALUES (?, ?, ?)`,
      [sourceId, targetId, targetTitle]
    );
  }
}
