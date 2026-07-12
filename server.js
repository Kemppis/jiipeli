const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(path.join(__dirname, 'jiipeli.db'));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const initThreads = db.prepare(`
  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )
`).run();

const initReplies = db.prepare(`
  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threadId INTEGER NOT NULL,
    body TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(threadId) REFERENCES threads(id) ON DELETE CASCADE
  )
`).run();

function getThreads() {
  const threads = db.prepare('SELECT id, title, message, createdAt FROM threads ORDER BY datetime(createdAt) DESC').all();
  const replies = db.prepare('SELECT id, threadId, body, createdAt FROM replies ORDER BY datetime(createdAt) ASC').all();
  const repliesByThread = replies.reduce((map, reply) => {
    map[reply.threadId] = map[reply.threadId] || [];
    map[reply.threadId].push(reply);
    return map;
  }, {});

  return threads.map(thread => ({
    ...thread,
    replies: repliesByThread[thread.id] || [],
  }));
}

app.get('/api/threads', (req, res) => {
  res.json(getThreads());
});

app.post('/api/threads', (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  const createdAt = new Date().toISOString();
  const info = db.prepare('INSERT INTO threads (title, message, createdAt) VALUES (?, ?, ?)').run(title, message, createdAt);
  res.status(201).json({
    id: info.lastInsertRowid,
    title,
    message,
    createdAt,
    replies: [],
  });
});

app.post('/api/threads/:threadId/replies', (req, res) => {
  const threadId = Number(req.params.threadId);
  const { body } = req.body;
  if (!body) {
    return res.status(400).json({ error: 'Reply body is required.' });
  }

  const thread = db.prepare('SELECT id FROM threads WHERE id = ?').get(threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found.' });
  }

  const createdAt = new Date().toISOString();
  const info = db.prepare('INSERT INTO replies (threadId, body, createdAt) VALUES (?, ?, ?)').run(threadId, body, createdAt);
  res.status(201).json({
    id: info.lastInsertRowid,
    threadId,
    body,
    createdAt,
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Jiipeli server running at http://localhost:${port}`);
});
