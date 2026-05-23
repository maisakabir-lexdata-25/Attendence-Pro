/**
 * Attendance Pro — Next.js Custom Server
 * Merges Express API + WebSocket + Excel Watcher alongside Next.js
 */
'use strict';

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const express          = require('express');
const cors             = require('cors');
const jwt              = require('jsonwebtoken');
const bcrypt           = require('bcryptjs');
const { WebSocketServer } = require('ws');
const chokidar         = require('chokidar');
const XLSX             = require('xlsx');
const path             = require('path');
const fs               = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const dev      = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const PORT     = parseInt(process.env.PORT || '3000', 10);

const nextApp = next({ dev, hostname, port: PORT });
const handle  = nextApp.getRequestHandler();

/* ── Users (replace with DB in production) ── */
const USERS = [
  { id: 1, name: 'Super Admin',           email: 'superadmin@example.com', password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', role: 'superadmin', avatar: 'SA' },
  { id: 2, name: 'Admin & Team Supervisor', email: 'admin@example.com',      password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', role: 'admin',      avatar: 'AU' },
  { id: 3, name: 'Employee User',          email: 'employee@example.com',   password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu',  role: 'employee',   avatar: 'EU' },
];

const JWT_SECRET  = process.env.JWT_SECRET  || 'attendance-pro-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar },
    JWT_SECRET, { expiresIn: JWT_EXPIRES }
  );
}
function verifyToken(token) { return jwt.verify(token, JWT_SECRET); }

/* ── In-memory state ── */
const cache      = new Map();
const snapshots  = new Map();
const changeLogs = new Map();
let serverConfig = {
  defaultSheetId: process.env.DEFAULT_SHEET_ID || '',
  defaultRange:   process.env.DEFAULT_RANGE    || 'Sheet1',
  cacheTtlMs:     parseInt(process.env.CACHE_TTL_MS || '60000'),
  googleApiKey:   process.env.GOOGLE_API_KEY   || '',
};

/* ── Local Excel Watcher ── */
const LOCAL_FILE_PATH = process.env.LOCAL_EXCEL_PATH ||
  'C:\\Users\\HP\\OneDrive - lexdatalabs\\mk\\Test attendence system.xlsx';

let localFileData     = null;
let localFileSnapshot = null;

function parseLocalExcel(filePath) {
  try {
    const wb  = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
    const out = { sheets: {}, fileName: path.basename(filePath), fetchedAt: new Date().toISOString() };
    wb.SheetNames.forEach(name => {
      const arr     = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false });
      if (!arr.length) { out.sheets[name] = { headers: [], rows: [] }; return; }
      const headers = arr[0].map(h => String(h ?? '').trim());
      const rows    = arr.slice(1).map((row, i) => {
        const obj = { _rowIndex: i + 1 };
        headers.forEach((h, ci) => { obj[h] = row[ci] !== undefined ? String(row[ci]) : ''; });
        return obj;
      });
      out.sheets[name] = { headers, rows };
    });
    return out;
  } catch (e) { console.error('[LocalFile] Parse error:', e.message); return null; }
}

function detectChanges(prev, curr, headers) {
  const pm = new Map(prev.map(r => [r._rowIndex, r]));
  const cm = new Map(curr.map(r => [r._rowIndex, r]));
  const added = [], deleted = [], updated = [];
  for (const [i, cur] of cm) {
    const p = pm.get(i);
    if (!p) { added.push({ rowIndex: i, row: cur }); }
    else {
      const diffs = headers.filter(h => String(p[h]??'') !== String(cur[h]??'')).map(h=>({ col:h, old:p[h]??'', new:cur[h]??'' }));
      if (diffs.length) updated.push({ rowIndex: i, diffs });
    }
  }
  for (const [i, p] of pm) if (!cm.has(i)) deleted.push({ rowIndex: i, row: p });
  return { added, deleted, updated, hasDiff: added.length > 0 || deleted.length > 0 || updated.length > 0 };
}

/* ── WebSocket broadcast ── */
let wss;
function broadcast(type, payload) {
  if (!wss) return;
  const msg = JSON.stringify({ type, payload, ts: new Date().toISOString() });
  wss.clients.forEach(ws => { if (ws.readyState === ws.OPEN) ws.send(msg); });
}

function loadAndBroadcast(filePath, isInitial = false) {
  const parsed = parseLocalExcel(filePath);
  if (!parsed) return;
  const prev = localFileSnapshot;
  localFileSnapshot = parsed;
  localFileData     = parsed;
  if (!isInitial && prev) {
    const changes = [];
    Object.keys(parsed.sheets).forEach(name => {
      const ps = prev.sheets[name], cs = parsed.sheets[name];
      if (!ps) { changes.push({ sheet: name, type: 'new_sheet' }); return; }
      const diff = detectChanges(ps.rows, cs.rows, cs.headers);
      if (diff.hasDiff) changes.push({ sheet: name, ...diff });
    });
    if (changes.length) broadcast('LOCAL_FILE_CHANGE', { fileName: parsed.fileName, changes, fetchedAt: parsed.fetchedAt });
  }
  broadcast('LOCAL_FILE_REFRESH', { fileName: parsed.fileName, fetchedAt: parsed.fetchedAt, sheetNames: Object.keys(parsed.sheets) });
  if (isInitial) console.log(`[LocalFile] ✅ Loaded: ${parsed.fileName}  →  Sheets: ${Object.keys(parsed.sheets).join(', ')}`);
}

nextApp.prepare().then(() => {
  const expressApp = express();

  expressApp.use(cors({ origin: true, credentials: true }));
  expressApp.use(express.json({ limit: '50mb' }));

  /* ── Auth middleware helper ── */
  function authMiddleware(req, res, next) {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    try { req.user = verifyToken(h.split(' ')[1]); next(); }
    catch { res.status(401).json({ error: 'Token expired or invalid' }); }
  }

  /* ════════════════ API ROUTES ════════════════ */

  /* POST /api/auth/login */
  expressApp.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  });

  /* GET /api/auth/me */
  expressApp.get('/api/auth/me', authMiddleware, (req, res) => res.json({ user: req.user }));

  /* GET /api/localfile */
  expressApp.get('/api/localfile', authMiddleware, (req, res) => {
    if (!localFileData) return res.status(404).json({ error: 'Local Excel file not loaded.' });
    const { sheet } = req.query;
    if (sheet) {
      const s = localFileData.sheets[sheet];
      if (!s) return res.status(404).json({ error: `Sheet "${sheet}" not found.` });
      return res.json({ fileName: localFileData.fileName, fetchedAt: localFileData.fetchedAt, sheetName: sheet, headers: s.headers, rows: s.rows });
    }
    res.json(localFileData);
  });

  /* GET /api/localfile/sheets */
  expressApp.get('/api/localfile/sheets', authMiddleware, (req, res) => {
    if (!localFileData) return res.status(404).json({ error: 'Local Excel file not loaded.' });
    res.json({ fileName: localFileData.fileName, fetchedAt: localFileData.fetchedAt, sheets: Object.keys(localFileData.sheets) });
  });

  /* POST /api/localfile/refresh */
  expressApp.post('/api/localfile/refresh', authMiddleware, (req, res) => {
    if (!fs.existsSync(LOCAL_FILE_PATH)) return res.status(404).json({ error: 'File not found.' });
    loadAndBroadcast(LOCAL_FILE_PATH);
    res.json({ message: 'Refreshed', fetchedAt: localFileData?.fetchedAt });
  });

  /* POST /api/localfile/employee — add */
  expressApp.post('/api/localfile/employee', authMiddleware, (req, res) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Name required.' });
      if (!fs.existsSync(LOCAL_FILE_PATH)) return res.status(404).json({ error: 'File not found.' });
      const wb = XLSX.read(fs.readFileSync(LOCAL_FILE_PATH), { type: 'buffer', cellStyles: true });
      let newId = 1;
      wb.SheetNames.forEach(n => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false });
        rows.slice(1).forEach(r => { const sl = parseInt(r[0], 10); if (!isNaN(sl) && sl >= newId) newId = sl + 1; });
      });
      wb.SheetNames.forEach(n => {
        const low = n.toLowerCase();
        if (low.includes('fingerprint') || low === 'leave list') return;
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false });
        if (!rows.length) return;
        rows.push([newId, name.trim(), ...Array(Math.max(0, rows[0].length - 2)).fill('')]);
        wb.Sheets[n] = XLSX.utils.aoa_to_sheet(rows);
      });
      XLSX.writeFile(wb, LOCAL_FILE_PATH);
      setTimeout(() => loadAndBroadcast(LOCAL_FILE_PATH), 500);
      res.json({ message: 'Employee added', id: newId, name: name.trim() });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* DELETE /api/localfile/employee/:id */
  expressApp.delete('/api/localfile/employee/:id', authMiddleware, (req, res) => {
    try {
      const targetId = String(req.params.id).trim();
      if (!fs.existsSync(LOCAL_FILE_PATH)) return res.status(404).json({ error: 'File not found.' });
      const wb = XLSX.read(fs.readFileSync(LOCAL_FILE_PATH), { type: 'buffer', cellStyles: true });
      let removedName = '', count = 0;
      wb.SheetNames.forEach(n => {
        const low = n.toLowerCase();
        if (low.includes('fingerprint') || low === 'leave list') return;
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false });
        if (rows.length <= 1) return;
        const filtered = rows.slice(1).filter(r => { if (String(r[0]||'').trim()===targetId){if(!removedName)removedName=String(r[1]||'').trim();count++;return false;}return true;});
        wb.Sheets[n] = XLSX.utils.aoa_to_sheet([rows[0], ...filtered]);
      });
      if (!count) return res.status(404).json({ error: `Employee ID ${targetId} not found.` });
      XLSX.writeFile(wb, LOCAL_FILE_PATH);
      setTimeout(() => loadAndBroadcast(LOCAL_FILE_PATH), 500);
      res.json({ message: 'Employee removed', id: targetId, name: removedName });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* PUT /api/localfile/employee/:id */
  expressApp.put('/api/localfile/employee/:id', authMiddleware, (req, res) => {
    try {
      const targetId = String(req.params.id).trim();
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Name required.' });
      if (!fs.existsSync(LOCAL_FILE_PATH)) return res.status(404).json({ error: 'File not found.' });
      const wb = XLSX.read(fs.readFileSync(LOCAL_FILE_PATH), { type: 'buffer', cellStyles: true });
      let updatedCount = 0;
      wb.SheetNames.forEach(n => {
        const low = n.toLowerCase();
        if (low.includes('fingerprint') || low === 'leave list') return;
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false });
        if (rows.length <= 1) return;
        let modified = false;
        const updated = rows.slice(1).map(r => { if(String(r[0]||'').trim()===targetId){r[1]=name.trim();updatedCount++;modified=true;}return r; });
        if (modified) wb.Sheets[n] = XLSX.utils.aoa_to_sheet([rows[0], ...updated]);
      });
      if (!updatedCount) return res.status(404).json({ error: `Employee ID ${targetId} not found.` });
      XLSX.writeFile(wb, LOCAL_FILE_PATH);
      setTimeout(() => loadAndBroadcast(LOCAL_FILE_PATH), 500);
      res.json({ message: 'Employee updated', id: targetId, name: name.trim() });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* POST /api/sheets/csv — upload CSV/Excel from browser */
  expressApp.post('/api/sheets/csv', authMiddleware, (req, res) => {
    try {
      const { filename, headers, rows } = req.body;
      if (!headers || !rows) return res.status(400).json({ error: 'headers and rows required' });
      const sid      = `CSV::${filename || 'upload'}`;
      const cacheKey = `${sid}::Sheet1`;
      snapshots.set(cacheKey, { rows, headers, fetchedAt: new Date().toISOString() });
      cache.set(cacheKey, { data: { headers, rows }, ts: Date.now() });
      serverConfig.defaultSheetId = sid;
      serverConfig.defaultRange   = 'Sheet1';
      broadcast('DATA_REFRESH', { meta: { sheetId: sid, range: 'Sheet1', rowCount: rows.length } });
      res.json({ message: 'CSV loaded', meta: { sheetId: sid, rowCount: rows.length } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* GET /api/admin/config */
  expressApp.get('/api/admin/config', authMiddleware, (req, res) => res.json({ config: serverConfig }));

  /* POST /api/admin/config */
  expressApp.post('/api/admin/config', authMiddleware, (req, res) => {
    ['defaultSheetId','defaultRange','cacheTtlMs','googleApiKey'].forEach(k => { if (req.body[k] !== undefined) serverConfig[k] = req.body[k]; });
    res.json({ message: 'Config updated', config: serverConfig });
  });

  /* GET /api/health */
  expressApp.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  /* ── Fall-through to Next.js for all other routes ── */
  expressApp.all(/.*/, (req, res) => handle(req, res, parse(req.url, true)));

  /* ════════════════ HTTP + WS SERVER ════════════════ */
  const httpServer = createServer(expressApp);

  wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (ws, req) => {
    const token = new URLSearchParams(req.url?.split('?')[1] || '').get('token');
    try { ws._user = verifyToken(token); } catch { ws._user = null; }
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: 'WELCOME', msg: 'Connected to Attendance Pro' }));
  });
  setInterval(() => { wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 30000);

  /* ── Start local Excel watcher ── */
  if (fs.existsSync(LOCAL_FILE_PATH)) {
    loadAndBroadcast(LOCAL_FILE_PATH, true);
    chokidar.watch(LOCAL_FILE_PATH, { persistent: true, usePolling: true, interval: 3000, awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 500 } })
      .on('change', fp => { console.log(`[LocalFile] 🔄 ${path.basename(fp)}`); loadAndBroadcast(fp); });
  } else {
    console.warn(`[LocalFile] ⚠️  File not found: ${LOCAL_FILE_PATH}`);
  }

  httpServer.listen(PORT, () => {
    console.log(`\n✅  Attendance Pro (Next.js) →  http://${hostname}:${PORT}`);
    console.log(`    API  →  http://${hostname}:${PORT}/api`);
    console.log(`    WS   →  ws://${hostname}:${PORT}`);
    console.log(`    Roles: superadmin | admin | employee\n`);
  });
}).catch(err => { console.error(err); process.exit(1); });
