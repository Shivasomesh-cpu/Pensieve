import express from 'express';
import crypto from 'crypto';
import { getDb, queryAll, queryOne, runQuery, saveDb, processBacklinksForNote, clearAllNotes } from './db.ts';
import { extractUrlContent, decodeContentWithAI, resolveMcpContext, OpenRouterAIError } from './ingest.ts';

const app = express();

app.use(express.json({ limit: '25mb' }));

// Keep health checks independent from database startup so deployments can be diagnosed.
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Middleware to normalize URL paths for Vercel serverless functions
app.use((req, res, next) => {
  const original = (req.headers['x-matched-path'] as string) || (req.headers['x-now-route-matches'] as string) || req.url;
  if (original && original !== '/api' && original !== '/') {
    req.url = original;
  }
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  next();
});

// Middleware to ensure Database is initialized
app.use(async (req, res, next) => {
  try {
    await getDb();
    next();
  } catch (err) {
    next(err);
  }
});

// Helper to insert and save an ingested cluster of notes
function saveIngestedCluster(cluster: { mainNote: any; connectedNotes: any[] }, db: any) {
  const now = new Date().toISOString();
  const createdNoteIds: string[] = [];

  const upsertNote = (noteData: { title: string; content: string; tags?: string[] }) => {
    const cleanTitle = noteData.title ? noteData.title.trim() : 'Ingested Concept';
    if (!cleanTitle) return null;

    let existing = queryOne(db, `SELECT id FROM notes WHERE LOWER(title) = LOWER(?)`, [cleanTitle]);
    let noteId = existing ? existing.id : 'note-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');

    if (existing) {
      runQuery(
        db,
        `UPDATE notes SET content = ?, is_ghost = 0, updated_at = ? WHERE id = ?`,
        [noteData.content, now, noteId]
      );
    } else {
      runQuery(
        db,
        `INSERT INTO notes (id, title, content, type, is_ghost, is_pinned, is_archived, is_public, created_at, updated_at)
         VALUES (?, ?, ?, 'note', 0, 0, 0, 0, ?, ?)`,
        [noteId, cleanTitle, noteData.content, now, now]
      );
    }

    runQuery(db, `DELETE FROM tags WHERE note_id = ?`, [noteId]);
    const tags = noteData.tags || ['imported'];
    for (const t of tags) {
      const cleanTag = String(t).trim().toLowerCase().replace(/^#/, '');
      if (cleanTag) {
        runQuery(db, `INSERT OR IGNORE INTO tags (note_id, tag) VALUES (?, ?)`, [noteId, cleanTag]);
      }
    }

    return { id: noteId, title: cleanTitle, content: noteData.content };
  };

  const mainResult = upsertNote(cluster.mainNote);
  if (mainResult) createdNoteIds.push(mainResult.id);

  if (Array.isArray(cluster.connectedNotes)) {
    for (const cn of cluster.connectedNotes) {
      const connResult = upsertNote(cn);
      if (connResult) createdNoteIds.push(connResult.id);
    }
  }

  if (mainResult) {
    processBacklinksForNote(db, mainResult.id, mainResult.title, mainResult.content);
  }
  if (Array.isArray(cluster.connectedNotes)) {
    for (const cn of cluster.connectedNotes) {
      const noteRow = queryOne(db, `SELECT id, title, content FROM notes WHERE LOWER(title) = LOWER(?)`, [cn.title.trim()]);
      if (noteRow) {
        processBacklinksForNote(db, noteRow.id, noteRow.title, noteRow.content);
      }
    }
  }

  return {
    mainNoteId: mainResult ? mainResult.id : null,
    createdCount: createdNoteIds.length,
  };
}

// Helper to extract tags from array or string
function parseTagsInput(tagsInput: any): string[] {
  if (!tagsInput) return [];
  if (Array.isArray(tagsInput)) {
    return tagsInput.map(t => String(t).trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
  }
  if (typeof tagsInput === 'string') {
    return tagsInput.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
  }
  return [];
}

// ------------------------------------------------------------------
// API ROUTES (with dual path matching for /api/* and /*)
// ------------------------------------------------------------------

// GET /api/notes - Filter & Search
app.get(['/api/notes', '/notes'], async (req, res) => {
  try {
    const db = await getDb();
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';
    const type = typeof req.query.type === 'string' ? req.query.type : 'all';
    const dateRange = typeof req.query.dateRange === 'string' ? req.query.dateRange : 'all';

    let sql = `SELECT DISTINCT n.* FROM notes n`;
    const params: any[] = [];
    const conditions: string[] = ['n.is_archived = 0'];

    if (tag) {
      sql += ` JOIN tags t ON n.id = t.note_id`;
      conditions.push(`LOWER(t.tag) = ?`);
      params.push(tag);
    }

    if (type && type !== 'all') {
      conditions.push(`n.type = ?`);
      params.push(type);
    }

    if (q) {
      conditions.push(`(LOWER(n.title) LIKE ? OR LOWER(n.content) LIKE ?)`);
      const searchPattern = `%${q.toLowerCase()}%`;
      params.push(searchPattern, searchPattern);
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 86400000);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getTime() - 30 * 86400000);
      } else {
        startDate = new Date(0);
      }
      conditions.push(`n.updated_at >= ?`);
      params.push(startDate.toISOString());
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY n.is_pinned DESC, n.updated_at DESC`;

    const notes = queryAll(db, sql, params);

    // Attach tags for each note
    const notesWithTags = notes.map(note => {
      const tagRows = queryAll<{ tag: string }>(db, `SELECT tag FROM tags WHERE note_id = ?`, [note.id]);
      return {
        ...note,
        is_ghost: Boolean(note.is_ghost),
        is_pinned: Boolean(note.is_pinned),
        is_archived: Boolean(note.is_archived),
        is_public: Boolean(note.is_public),
        tags: tagRows.map(tr => tr.tag)
      };
    });

    res.json(notesWithTags);
  } catch (err: any) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notes' });
  }
});

// GET /api/notes/by-title/:title - Lookup by title
app.get(['/api/notes/by-title/:title', '/notes/by-title/:title'], async (req, res) => {
  try {
    const db = await getDb();
    const title = decodeURIComponent(req.params.title).trim();
    const note = queryOne(db, `SELECT * FROM notes WHERE LOWER(title) = LOWER(?)`, [title]);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const tagRows = queryAll<{ tag: string }>(db, `SELECT tag FROM tags WHERE note_id = ?`, [note.id]);
    res.json({
      ...note,
      is_ghost: Boolean(note.is_ghost),
      is_pinned: Boolean(note.is_pinned),
      is_archived: Boolean(note.is_archived),
      is_public: Boolean(note.is_public),
      tags: tagRows.map(tr => tr.tag)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch note by title' });
  }
});

// GET /api/notes/:id - Fetch by ID
app.get(['/api/notes/:id', '/notes/:id'], async (req, res) => {
  try {
    const db = await getDb();
    const note = queryOne(db, `SELECT * FROM notes WHERE id = ?`, [req.params.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const tagRows = queryAll<{ tag: string }>(db, `SELECT tag FROM tags WHERE note_id = ?`, [note.id]);
    res.json({
      ...note,
      is_ghost: Boolean(note.is_ghost),
      is_pinned: Boolean(note.is_pinned),
      is_archived: Boolean(note.is_archived),
      is_public: Boolean(note.is_public),
      tags: tagRows.map(tr => tr.tag)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch note' });
  }
});

// POST /api/notes - Create note
app.post(['/api/notes', '/notes'], async (req, res) => {
  try {
    const db = await getDb();
    const { title, content = '', type = 'note', tags = [] } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const cleanTitle = title.trim();
    const existing = queryOne(db, `SELECT id FROM notes WHERE LOWER(title) = LOWER(?)`, [cleanTitle]);
    if (existing) {
      return res.status(400).json({ error: `A note titled "${cleanTitle}" already exists` });
    }

    const id = 'note-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
    const now = new Date().toISOString();
    const parsedTags = parseTagsInput(tags);

    runQuery(
      db,
      `INSERT INTO notes (id, title, content, type, is_ghost, is_pinned, is_archived, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`,
      [id, cleanTitle, content, type, now, now]
    );

    for (const t of parsedTags) {
      runQuery(db, `INSERT OR IGNORE INTO tags (note_id, tag) VALUES (?, ?)`, [id, t]);
    }

    processBacklinksForNote(db, id, cleanTitle, content);

    const createdNote = queryOne(db, `SELECT * FROM notes WHERE id = ?`, [id]);
    res.status(201).json({
      ...createdNote,
      is_ghost: false,
      is_pinned: false,
      is_archived: false,
      is_public: false,
      tags: parsedTags
    });
  } catch (err: any) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: err.message || 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update note & handle title renames
app.put(['/api/notes/:id', '/notes/:id'], async (req, res) => {
  try {
    const db = await getDb();
    const noteId = req.params.id;
    const existingNote = queryOne(db, `SELECT * FROM notes WHERE id = ?`, [noteId]);
    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const {
      title = existingNote.title,
      content = existingNote.content,
      is_pinned = existingNote.is_pinned,
      is_archived = existingNote.is_archived,
      tags = []
    } = req.body;

    const newTitle = title.trim();
    const oldTitle = existingNote.title;
    const now = new Date().toISOString();

    if (newTitle.toLowerCase() !== oldTitle.toLowerCase()) {
      const titleConflict = queryOne(db, `SELECT id FROM notes WHERE LOWER(title) = LOWER(?) AND id != ?`, [newTitle, noteId]);
      if (titleConflict) {
        return res.status(400).json({ error: `A note titled "${newTitle}" already exists` });
      }

      const allNotes = queryAll<{ id: string; content: string }>(db, `SELECT id, content FROM notes WHERE content LIKE ?`, [`%[[${oldTitle}]]%`]);
      for (const dependent of allNotes) {
        const updatedContent = dependent.content.replaceAll(`[[${oldTitle}]]`, `[[${newTitle}]]`);
        runQuery(db, `UPDATE notes SET content = ?, updated_at = ? WHERE id = ?`, [updatedContent, now, dependent.id]);
      }
    }

    const isGhostNow = existingNote.is_ghost ? 0 : 0;

    runQuery(
      db,
      `UPDATE notes
       SET title = ?, content = ?, is_ghost = ?, is_pinned = ?, is_archived = ?, updated_at = ?
       WHERE id = ?`,
      [newTitle, content, isGhostNow, is_pinned ? 1 : 0, is_archived ? 1 : 0, now, noteId]
    );

    runQuery(db, `DELETE FROM tags WHERE note_id = ?`, [noteId]);
    const parsedTags = parseTagsInput(tags);
    for (const t of parsedTags) {
      runQuery(db, `INSERT OR IGNORE INTO tags (note_id, tag) VALUES (?, ?)`, [noteId, t]);
    }

    processBacklinksForNote(db, noteId, newTitle, content);

    const updatedNote = queryOne(db, `SELECT * FROM notes WHERE id = ?`, [noteId]);
    res.json({
      ...updatedNote,
      is_ghost: Boolean(updatedNote.is_ghost),
      is_pinned: Boolean(updatedNote.is_pinned),
      is_archived: Boolean(updatedNote.is_archived),
      is_public: Boolean(updatedNote.is_public),
      tags: parsedTags
    });
  } catch (err: any) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: err.message || 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - Safe deletion
app.delete(['/api/notes/:id', '/notes/:id'], async (req, res) => {
  try {
    const db = await getDb();
    const noteId = req.params.id;
    const force = req.query.force === 'true';

    const note = queryOne(db, `SELECT * FROM notes WHERE id = ?`, [noteId]);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const referencingRows = queryAll<{ id: string; title: string }>(
      db,
      `SELECT DISTINCT source.id, source.title
       FROM links l
       JOIN notes source ON l.source_id = source.id
       WHERE l.target_id = ? AND l.source_id != ?`,
      [noteId, noteId]
    );

    if (referencingRows.length > 0 && !force) {
      return res.json({
        warning: true,
        message: `This note is referenced by ${referencingRows.length} other note(s). Deleting it will turn these links into ghost references.`,
        referencingNotes: referencingRows
      });
    }

    runQuery(db, `DELETE FROM tags WHERE note_id = ?`, [noteId]);
    runQuery(db, `DELETE FROM links WHERE source_id = ? OR target_id = ?`, [noteId, noteId]);
    runQuery(db, `DELETE FROM notes WHERE id = ?`, [noteId]);

    res.json({ success: true, deletedId: noteId });
  } catch (err: any) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: err.message || 'Failed to delete note' });
  }
});

// GET /api/notes/:id/backlinks
app.get(['/api/notes/:id/backlinks', '/notes/:id/backlinks'], async (req, res) => {
  try {
    const db = await getDb();
    const noteId = req.params.id;

    const incomingRows = queryAll<any>(
      db,
      `SELECT DISTINCT source.id, source.title, source.content, source.type, source.updated_at
       FROM links l
       JOIN notes source ON l.source_id = source.id
       WHERE l.target_id = ?`,
      [noteId]
    );

    const outgoingRows = queryAll<any>(
      db,
      `SELECT DISTINCT target.id, target.title, target.content, target.type, target.updated_at
       FROM links l
       JOIN notes target ON l.target_id = target.id
       WHERE l.source_id = ?`,
      [noteId]
    );

    const currentNote = queryOne<{ title: string }>(db, `SELECT title FROM notes WHERE id = ?`, [noteId]);
    const currentTitle = currentNote ? currentNote.title : '';

    const formatBacklink = (n: any, referenceTitle: string) => {
      let snippet = n.content || '';
      if (referenceTitle && snippet) {
        const idx = snippet.toLowerCase().indexOf(`[[${referenceTitle.toLowerCase()}]]`);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(snippet.length, idx + referenceTitle.length + 40);
          snippet = (start > 0 ? '...' : '') + snippet.substring(start, end) + (end < snippet.length ? '...' : '');
        } else {
          snippet = snippet.substring(0, 100) + '...';
        }
      } else {
        snippet = snippet.substring(0, 100) + '...';
      }

      return {
        id: n.id,
        title: n.title,
        snippet,
        type: n.type,
        updated_at: n.updated_at
      };
    };

    res.json({
      incoming: incomingRows.map(n => formatBacklink(n, currentTitle)),
      outgoing: outgoingRows.map(n => formatBacklink(n, n.title))
    });
  } catch (err: any) {
    console.error('Error fetching backlinks:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch backlinks' });
  }
});

// GET /api/graph
app.get(['/api/graph', '/graph'], async (req, res) => {
  try {
    const db = await getDb();
    const allNotes = queryAll<any>(db, `SELECT id, title, type, is_ghost FROM notes WHERE is_archived = 0`);
    const allEdges = queryAll<any>(db, `SELECT source_id as source, target_id as target, target_title FROM links`);

    const connectionCounts: Record<string, number> = {};
    allNotes.forEach(n => { connectionCounts[n.id] = 0; });

    allEdges.forEach(e => {
      if (connectionCounts[e.source] !== undefined) connectionCounts[e.source]++;
      if (connectionCounts[e.target] !== undefined) connectionCounts[e.target]++;
    });

    const nodes = allNotes.map(n => ({
      id: n.id,
      title: n.title,
      type: n.type,
      is_ghost: Boolean(n.is_ghost),
      connectionCount: connectionCounts[n.id] || 0
    }));

    res.json({ nodes, edges: allEdges });
  } catch (err: any) {
    console.error('Error generating graph data:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch graph data' });
  }
});

// GET /api/tags
app.get(['/api/tags', '/tags'], async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll<{ tag: string; count: number }>(
      db,
      `SELECT tag, COUNT(*) as count FROM tags GROUP BY tag ORDER BY count DESC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch tags' });
  }
});

// GET & POST /api/journal/today - Today's Journal Entry
app.all(['/api/journal/today', '/journal/today'], async (req, res) => {
  try {
    const db = await getDb();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTitle = `Journal: ${todayStr}`;

    let journalNote = queryOne(db, `SELECT * FROM notes WHERE title = ? AND type = 'journal'`, [todayTitle]);

    if (!journalNote) {
      const id = 'journal-' + todayStr;
      const now = new Date().toISOString();
      const content = `# Daily Journal — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\nToday's thoughts and research log...\n\n- Linking ideas with [[Zettelkasten Method]]`;

      runQuery(
        db,
        `INSERT INTO notes (id, title, content, type, is_ghost, is_pinned, is_archived, is_public, created_at, updated_at)
         VALUES (?, ?, ?, 'journal', 0, 0, 0, 0, ?, ?)`,
        [id, todayTitle, content, now, now]
      );

      runQuery(db, `INSERT OR IGNORE INTO tags (note_id, tag) VALUES (?, 'journal')`, [id]);
      processBacklinksForNote(db, id, todayTitle, content);

      journalNote = queryOne(db, `SELECT * FROM notes WHERE id = ?`, [id]);
    }

    const tagRows = queryAll<{ tag: string }>(db, `SELECT tag FROM tags WHERE note_id = ?`, [journalNote.id]);
    res.json({
      ...journalNote,
      is_ghost: false,
      is_pinned: Boolean(journalNote.is_pinned),
      is_archived: Boolean(journalNote.is_archived),
      is_public: Boolean(journalNote.is_public),
      tags: tagRows.map(tr => tr.tag)
    });
  } catch (err: any) {
    console.error('Error opening today journal:', err);
    res.status(500).json({ error: err.message || 'Failed to open today journal' });
  }
});

// GET /api/journal/streak
app.get(['/api/journal/streak', '/journal/streak'], async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll<{ date_str: string }>(
      db,
      `SELECT DISTINCT substr(created_at, 1, 10) as date_str
       FROM notes
       WHERE type = 'journal' OR id IN (SELECT note_id FROM tags WHERE tag = 'journal')
       ORDER BY date_str DESC`
    );

    const dates = rows.map(r => r.date_str);
    const todayStr = new Date().toISOString().split('T')[0];
    const hasEntryToday = dates.includes(todayStr);

    let streak = 0;
    if (dates.length > 0) {
      let checkDate = new Date();
      if (!hasEntryToday) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const formatted = checkDate.toISOString().split('T')[0];
        if (dates.includes(formatted)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    res.json({
      currentStreak: streak,
      hasEntryToday,
      totalJournals: dates.length,
      lastJournalDate: dates.length > 0 ? dates[0] : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate streak' });
  }
});

// POST /api/notes/:id/share - Generate public share link
app.post(['/api/notes/:id/share', '/notes/:id/share'], async (req, res) => {
  try {
    const db = await getDb();
    const noteId = req.params.id;
    let note = queryOne(db, `SELECT * FROM notes WHERE id = ?`, [noteId]);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    let shareToken = note.share_token;
    if (!shareToken) {
      shareToken = crypto.randomBytes(16).toString('hex');
    }

    runQuery(db, `UPDATE notes SET is_public = 1, share_token = ? WHERE id = ?`, [shareToken, noteId]);

    res.json({
      shareToken,
      is_public: true,
      shareUrl: `/share/${shareToken}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to share note' });
  }
});

// DELETE /api/notes/:id/share - Revoke public share link
app.delete(['/api/notes/:id/share', '/notes/:id/share'], async (req, res) => {
  try {
    const db = await getDb();
    const noteId = req.params.id;
    runQuery(db, `UPDATE notes SET is_public = 0 WHERE id = ?`, [noteId]);
    res.json({ success: true, is_public: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to revoke share link' });
  }
});

// GET /api/share/:token - Public read-only note view
app.get(['/api/share/:token', '/share/:token'], async (req, res) => {
  try {
    const db = await getDb();
    const token = req.params.token;
    const note = queryOne(db, `SELECT * FROM notes WHERE share_token = ? AND is_public = 1`, [token]);
    if (!note) {
      return res.status(404).json({ error: 'Shared note not found or link has expired' });
    }

    const tagRows = queryAll<{ tag: string }>(db, `SELECT tag FROM tags WHERE note_id = ?`, [note.id]);
    res.json({
      title: note.title,
      content: note.content,
      type: note.type,
      updated_at: note.updated_at,
      created_at: note.created_at,
      tags: tagRows.map(tr => tr.tag)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load shared note' });
  }
});

// POST /api/notes/clear-all - Wipe all notes & canvas
app.post(['/api/notes/clear-all', '/notes/clear-all'], async (req, res) => {
  try {
    const db = await getDb();
    clearAllNotes(db);
    res.json({ success: true, message: 'All notes cleared successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear notes' });
  }
});

// POST /api/ingest/url - Fetch link/git repo & decode into interconnected knowledge cluster
app.post(['/api/ingest/url', '/ingest/url'], async (req, res) => {
  try {
    const db = await getDb();
    const { url, openRouterApiKey, modelName, mcpContext, mcpServers } = req.body;
    const apiKey = openRouterApiKey || (req.headers['x-openrouter-key'] as string);
    
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Valid URL or Git repository link is required' });
    }

    const { sourceName, textContent } = await extractUrlContent(url);
    const resolvedMcpContext = await resolveMcpContext(mcpServers, mcpContext);

    const cluster = await decodeContentWithAI(
      sourceName,
      textContent,
      apiKey,
      modelName || 'nvidia/llama-3.1-nemotron-70b-instruct',
      resolvedMcpContext
    );

    const result = saveIngestedCluster(cluster, db);

    res.status(201).json({
      success: true,
      mainNoteId: result.mainNoteId,
      createdCount: result.createdCount,
      mainTitle: cluster.mainNote.title,
      message: `Successfully ingested link and created ${result.createdCount} connected knowledge nodes!`,
    });
  } catch (err: any) {
    console.error('Error ingesting URL:', err);
    if (err instanceof OpenRouterAIError) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to decode link' });
  }
});

// POST /api/ingest/file - Decode uploaded file into interconnected knowledge cluster
app.post(['/api/ingest/file', '/ingest/file'], async (req, res) => {
  try {
    const db = await getDb();
    const { filename, fileData, mimeType, openRouterApiKey, modelName, mcpContext, mcpServers } = req.body;
    const apiKey = openRouterApiKey || (req.headers['x-openrouter-key'] as string);

    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Filename and fileData are required' });
    }

    let textContent = '';
    let base64Data: string | undefined = undefined;

    if (fileData.startsWith('data:')) {
      const parts = fileData.split(';base64,');
      if (parts.length === 2) {
        base64Data = parts[1];
      }
    } else {
      textContent = fileData;
    }

    const resolvedMcpContext = await resolveMcpContext(mcpServers, mcpContext);

    const cluster = await decodeContentWithAI(
      filename,
      textContent,
      apiKey,
      modelName || 'nvidia/llama-3.1-nemotron-70b-instruct',
      resolvedMcpContext,
      base64Data,
      mimeType
    );

    const result = saveIngestedCluster(cluster, db);

    res.status(201).json({
      success: true,
      mainNoteId: result.mainNoteId,
      createdCount: result.createdCount,
      mainTitle: cluster.mainNote.title,
      message: `Successfully decoded ${filename} into ${result.createdCount} connected knowledge nodes!`,
    });
  } catch (err: any) {
    console.error('Error ingesting file:', err);
    if (err instanceof OpenRouterAIError) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to decode file' });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

export default app;
