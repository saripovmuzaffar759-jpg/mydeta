const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Database('data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
  CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT);
  CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, collection_id INTEGER, data TEXT DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
`);

// Projects
app.get('/api/projects', (_, res) => res.json(db.prepare('SELECT * FROM projects').all()));
app.post('/api/projects', (req, res) => {
  const r = db.prepare('INSERT INTO projects (name) VALUES (?)').run(req.body.name);
  res.json({ id: r.lastInsertRowid });
});
app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Collections
app.get('/api/collections/:projectId', (req, res) => {
  res.json(db.prepare('SELECT * FROM collections WHERE project_id = ?').all(req.params.projectId));
});
app.post('/api/collections', (req, res) => {
  const { projectId, name } = req.body;
  const r = db.prepare('INSERT INTO collections (project_id, name) VALUES (?, ?)').run(projectId, name);
  res.json({ id: r.lastInsertRowid });
});
app.delete('/api/collections/:id', (req, res) => {
  db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Documents
app.get('/api/documents/:collectionId', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents WHERE collection_id = ? ORDER BY id DESC').all(req.params.collectionId);
  res.json(docs.map(d => ({ ...d, data: JSON.parse(d.data) })));
});
app.post('/api/documents', (req, res) => {
  const { collectionId, data } = req.body;
  const r = db.prepare('INSERT INTO documents (collection_id, data) VALUES (?, ?)').run(collectionId, JSON.stringify(data));
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/documents/:id', (req, res) => {
  db.prepare('UPDATE documents SET data = ? WHERE id = ?').run(JSON.stringify(req.body), req.params.id);
  res.json({ ok: true });
});
app.delete('/api/documents/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('http://localhost:' + PORT));
