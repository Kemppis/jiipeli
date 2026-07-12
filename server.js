const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(path.join(__dirname, 'jiipeli.db'));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const initSql = `
CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
);
`;

db.exec(initSql);

const insertThread = db.prepare('INSERT INTO threads (title, message, created_at) VALUES (?, ?, ?)');
const insertReply = db.prepare('INSERT INTO replies (thread_id, message, created_at) VALUES (?, ?, ?)');
const getThreads = db.prepare('SELECT id, title, message, created_at FROM threads ORDER BY created_at DESC');
const getReplies = db.prepare('SELECT id, thread_id, message, created_at FROM replies WHERE thread_id = ? ORDER BY created_at ASC');

app.get('/api/threads', (req, res) => {
  const threads = getThreads.all().map(thread => ({
    ...thread,
    replies: getReplies.all(thread.id),
  }));
  res.json(threads);
});

app.post('/api/threads', (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'title and message are required' });
  }
  const createdAt = new Date().toISOString();
  const info = insertThread.run(title.trim(), message.trim(), createdAt);
  res.status(201).json({ id: info.lastInsertRowid, title, message, created_at: createdAt, replies: [] });
});

app.post('/api/threads/:id/replies', (req, res) => {
  const threadId = Number(req.params.id);
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }
  const createdAt = new Date().toISOString();
  const info = insertReply.run(threadId, message.trim(), createdAt);
  res.status(201).json({ id: info.lastInsertRowid, thread_id: threadId, message, created_at: createdAt });
});

app.listen(3000, () => {
  console.log('Jiipeli server running on http://localhost:3000');
});
