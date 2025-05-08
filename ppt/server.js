const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});
app.use(express.json());
app.use(express.static('public'));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

let names = [];        // ["Alice","Bob",...]
let uploads = {};      // { "Alice": "alice.pdf", ... }

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // sanitize name → lowercase, replace non-alnum with _
    const safe = req.body.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, safe + ext);
  }
});
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.pdf', '.ppt', '.pptx'].includes(ext)) cb(null, true);
  else cb(new Error('Only .pdf, .ppt or .pptx allowed'), false);
};
const upload = multer({ storage, fileFilter });

// get list of names + upload status
app.get('/api/names', (_req, res) => {
  res.json(
    names.map(n => ({
      name: n,
      uploaded: !!uploads[n],
      fileUrl: uploads[n] ? `/uploads/${uploads[n]}` : null
    }))
  );
});

// add a new name
app.post('/api/names', (req, res) => {
  const { name } = req.body;
  if (!name || names.includes(name)) {
    return res.status(400).json({ error: 'Invalid or duplicate name' });
  }
  names.push(name);
  res.sendStatus(200);
});

// delete a name (and its file)
app.delete('/api/names/:name', (req, res) => {
  const { name } = req.params;
  const idx = names.indexOf(name);
  if (idx === -1) return res.status(404).json({ error: 'Name not found' });
  names.splice(idx, 1);
  if (uploads[name]) {
    fs.unlink(path.join(UPLOAD_DIR, uploads[name]), () => { });
    delete uploads[name];
  }
  res.sendStatus(200);
});

// handle file upload
app.post(
  '/api/upload',
  upload.single('file'),
  (req, res) => {
    const { name } = req.body;
    if (!names.includes(name)) {
      return res.status(400).json({ error: 'Unknown name' });
    }
    uploads[name] = req.file.filename;
    res.sendStatus(200);
  }
);

// serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`File-uploader running on http://localhost:${PORT}`)
);

