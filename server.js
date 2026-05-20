const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const CONFIG_FILE = path.join(__dirname, 'config', 'current-video.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password, X-Filename');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (url.pathname === '/api/upload' && req.method === 'POST') return handleUpload(req, res);
  if (url.pathname === '/api/video'  && req.method === 'GET')  return handleVideo(req, res);

  serveStatic(req, res, url.pathname);

}).listen(PORT, () => {
  console.log('\n  Te Quiero · Servidor local');
  console.log(`  Tienda  →  http://localhost:${PORT}`);
  console.log(`  Admin   →  http://localhost:${PORT}/admin`);
  console.log(`  Contraseña: ${ADMIN_PASSWORD}`);
  console.log('  (para cambiarla: ADMIN_PASSWORD=tu-clave node server.js)\n');
});

// ── API /api/upload ──────────────────────────────────────────────────────────

function handleUpload(req, res) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return json(res, 401, { error: 'Contraseña incorrecta' });
  }

  const filename = (req.headers['x-filename'] || `video-${Date.now()}.mp4`)
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = path.join(UPLOADS_DIR, filename);
  const out = fs.createWriteStream(dest);

  req.pipe(out);

  out.on('finish', () => {
    const config = { url: `/uploads/${filename}`, filename, updatedAt: new Date().toISOString() };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config));
    json(res, 200, { url: config.url });
  });

  out.on('error', (err) => json(res, 500, { error: err.message }));
}

// ── API /api/video ───────────────────────────────────────────────────────────

function handleVideo(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store');
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    json(res, 200, data);
  } catch {
    json(res, 200, { url: null });
  }
}

// ── Ficheros estáticos ───────────────────────────────────────────────────────

function serveStatic(req, res, pathname) {
  let filePath;
  if (pathname === '/' || pathname === '')            filePath = path.join(__dirname, 'index.html');
  else if (pathname === '/admin' || pathname === '/admin/') filePath = path.join(__dirname, 'admin', 'index.html');
  else filePath = path.join(__dirname, pathname.slice(1).replace(/\.\./g, ''));

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    // Range requests para vídeo
    if (type.startsWith('video/') && req.headers.range) {
      const [startStr, endStr] = req.headers.range.replace('bytes=', '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
