const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Database('data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );
`);

function generateKey() {
  return 'fb_' + Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2,15);
}

// ==================== ПРОЕКТЫ ====================
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT id, name, api_key, created_at FROM projects').all();
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const api_key = generateKey();
  const r = db.prepare('INSERT INTO projects (name, api_key) VALUES (?, ?)').run(name, api_key);
  res.json({ id: r.lastInsertRowid, name, api_key });
});

app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== КОЛЛЕКЦИИ ====================
app.get('/api/projects/:projectId/collections', (req, res) => {
  const cols = db.prepare('SELECT * FROM collections WHERE project_id = ?').all(req.params.projectId);
  res.json(cols);
});

app.post('/api/projects/:projectId/collections', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const r = db.prepare('INSERT INTO collections (project_id, name) VALUES (?, ?)').run(req.params.projectId, name);
  res.json({ id: r.lastInsertRowid, name });
});

app.delete('/api/collections/:id', (req, res) => {
  db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ДОКУМЕНТЫ (ПУБЛИЧНОЕ API) ====================
// Получить документы коллекции
app.get('/api/collections/:collectionId/documents', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents WHERE collection_id = ? ORDER BY id DESC').all(req.params.collectionId);
  res.json(docs.map(d => ({ id: d.id, ...JSON.parse(d.data), _created: d.created_at, _updated: d.updated_at })));
});

// Добавить документ
app.post('/api/collections/:collectionId/documents', (req, res) => {
  const data = req.body;
  const r = db.prepare('INSERT INTO documents (collection_id, data) VALUES (?, ?)').run(req.params.collectionId, JSON.stringify(data));
  res.json({ id: r.lastInsertRowid, ...data });
});

// Обновить документ
app.put('/api/documents/:id', (req, res) => {
  db.prepare('UPDATE documents SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(req.body), req.params.id);
  res.json({ id: parseInt(req.params.id), ...req.body });
});

// Удалить документ
app.delete('/api/documents/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ПУБЛИЧНОЕ API (КАК FIREBASE) ====================
app.get('/api/public/:collectionId', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents WHERE collection_id = ? ORDER BY id DESC').all(req.params.collectionId);
  res.json(docs.map(d => ({ id: d.id, ...JSON.parse(d.data) })));
});

app.post('/api/public/:collectionId', (req, res) => {
  const r = db.prepare('INSERT INTO documents (collection_id, data) VALUES (?, ?)').run(req.params.collectionId, JSON.stringify(req.body));
  res.json({ id: r.lastInsertRowid, ...req.body });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Firebase Clone: http://localhost:' + PORT);
});
