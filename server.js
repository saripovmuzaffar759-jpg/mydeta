const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Database('data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.get('/api/records', (req, res) => {
  const { search, status } = req.query;
  let query = 'SELECT * FROM records WHERE 1=1';
  const params = [];
  
  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push('%' + search + '%', '%' + search + '%');
  }
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY id DESC';
  
  const records = db.prepare(query).all(...params);
  res.json(records);
});

app.post('/api/records', (req, res) => {
  const { title, description, status } = req.body;
  const stmt = db.prepare('INSERT INTO records (title, description, status) VALUES (?, ?, ?)');
  const result = stmt.run(title, description, status || 'active');
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/records/:id', (req, res) => {
  const { title, description, status } = req.body;
  db.prepare('UPDATE records SET title = ?, description = ?, status = ? WHERE id = ?').run(title, description, status, req.params.id);
  res.json({ message: 'ok' });
});

app.delete('/api/records/:id', (req, res) => {
  db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
  res.json({ message: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('База работает на порту ' + PORT);
});
