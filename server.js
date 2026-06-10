const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = './data.json';

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch(e) {}
  return { projects: [], collections: [], documents: [], nextId: { project: 1, collection: 1, document: 1 } };
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

function genKey() {
  return 'fb_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Projects
app.get('/api/projects', (_, res) => res.json(data.projects));

app.post('/api/projects', (req, res) => {
  const p = { id: data.nextId.project++, name: req.body.name, api_key: genKey(), created_at: new Date().toISOString() };
  data.projects.push(p);
  saveData();
  res.json(p);
});

app.delete('/api/projects/:id', (req, res) => {
  const pid = parseInt(req.params.id);
  data.collections = data.collections.filter(c => c.project_id !== pid);
  data.documents = data.documents.filter(d => !data.collections.find(c => c.id === d.collection_id));
  data.projects = data.projects.filter(p => p.id !== pid);
  saveData();
  res.json({ ok: true });
});

// Collections
app.get('/api/projects/:projectId/collections', (req, res) => {
  res.json(data.collections.filter(c => c.project_id === parseInt(req.params.projectId)));
});

app.post('/api/projects/:projectId/collections', (req, res) => {
  const c = { id: data.nextId.collection++, project_id: parseInt(req.params.projectId), name: req.body.name, created_at: new Date().toISOString() };
  data.collections.push(c);
  saveData();
  res.json(c);
});

app.delete('/api/collections/:id', (req, res) => {
  const cid = parseInt(req.params.id);
  data.documents = data.documents.filter(d => d.collection_id !== cid);
  data.collections = data.collections.filter(c => c.id !== cid);
  saveData();
  res.json({ ok: true });
});

// Documents
app.get('/api/collections/:collectionId/documents', (req, res) => {
  res.json(data.documents.filter(d => d.collection_id === parseInt(req.params.collectionId)));
});

app.post('/api/collections/:collectionId/documents', (req, res) => {
  const d = { id: data.nextId.document++, collection_id: parseInt(req.params.collectionId), data: req.body, created_at: new Date().toISOString() };
  data.documents.push(d);
  saveData();
  res.json(d);
});

app.put('/api/documents/:id', (req, res) => {
  const d = data.documents.find(d => d.id === parseInt(req.params.id));
  if (!d) return res.status(404).json({ error: 'Not found' });
  d.data = req.body;
  d.updated_at = new Date().toISOString();
  saveData();
  res.json(d);
});

app.delete('/api/documents/:id', (req, res) => {
  data.documents = data.documents.filter(d => d.id !== parseInt(req.params.id));
  saveData();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Server on port ' + PORT));
