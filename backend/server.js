/**
 * DataSheet Dashboard — backend/server.js
 * Express API: Google Sheets proxy, JWT auth, RBAC, change detection, WebSocket
 * NEW: Local Excel file watcher (chokidar + SheetJS) for OneDrive xlsx real-time sync
 *
 * Setup:
 *   cd backend  →  npm install  →  node server.js
 *   (Frontend runs separately on port 5500 or any static server)
 */
'use strict';

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const rateLimit    = require('express-rate-limit');
const { google }   = require('googleapis');
const http         = require('http');
const { WebSocketServer } = require('ws');
const axios        = require('axios');
const chokidar     = require('chokidar');
const XLSX         = require('xlsx');
const path         = require('path');
const fs           = require('fs');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3000;

/* ── CORS: allow frontend origin ── */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5500';
app.use(cors({
  origin: [FRONTEND_ORIGIN, 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

/* ── Serve frontend from /frontend folder ── */
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

/* ── Chrome DevTools Automatic Workspace Folders ── */
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({
    workspace: {
      root: path.join(__dirname, '..').replace(/\\/g, '/'),
      uuid: '9c3a388b-21d7-4632-aa7c-87d4a2be29c7'
    }
  });
});

if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
  console.log(`[Static] Serving frontend from: ${FRONTEND_DIR}`);
}

/* ══════════════════════════════════════
   USERS  (replace with DB in production)
══════════════════════════════════════ */
const USERS = [
  {
    id: 1, name: 'Admin User', email: 'admin@example.com',
    password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', // admin123
    role: 'admin', avatar: 'AU',
  },
  {
    id: 2, name: 'Regular User', email: 'user@example.com',
    password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu', // user123
    role: 'user', avatar: 'RU',
  },
];

/* ══════════════════════════════════════
   GOOGLE SHEETS CLIENT
══════════════════════════════════════ */
function getSheetsClient() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    return google.sheets({ version: 'v4', auth });
  }
  const key = serverConfig.googleApiKey || process.env.GOOGLE_API_KEY;
  if (key) {
    return google.sheets({ version: 'v4', auth: key });
  }
  throw new Error('No Google credentials configured. Please set the API Key in the settings.');
}

/* ══════════════════════════════════════
   MICROSOFT GRAPH CLIENT (EXCEL)
══════════════════════════════════════ */
async function getMsGraphToken() {
  const params = new URLSearchParams();
  params.append('client_id', process.env.MS_CLIENT_ID);
  params.append('client_secret', process.env.MS_CLIENT_SECRET);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const url = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`;
  const res = await axios.post(url, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  return res.data.access_token;
}

async function fetchFromMSGraph(itemId, range) {
  const token = await getMsGraphToken();
  const driveId = process.env.MS_DRIVE_ID;
  const siteId = process.env.MS_SITE_ID;
  
  let baseUrl = '';
  if (driveId) {
    baseUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`;
  } else if (siteId) {
    baseUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}`;
  } else {
    throw new Error('Missing MS_DRIVE_ID or MS_SITE_ID in .env');
  }

  const sheetName = range.split('!')[0];
  const url = `${baseUrl}/workbook/worksheets('${sheetName}')/usedRange`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.data.values;
}

/* ══════════════════════════════════════
   JWT HELPERS
══════════════════════════════════════ */
const JWT_SECRET  = process.env.JWT_SECRET  || 'change-this-secret-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar },
    JWT_SECRET, { expiresIn: JWT_EXPIRES }
  );
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing or invalid token' });
  try {
    req.user = jwt.verify(h.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required' });
  next();
}

/* ══════════════════════════════════════
   IN-MEMORY CACHE
══════════════════════════════════════ */
const cache = new Map();
let CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '60000');

function getCached(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return e.data;
}
function setCached(key, data) { cache.set(key, { data, ts: Date.now() }); }

/* ══════════════════════════════════════
   CHANGE-DETECTION ENGINE
══════════════════════════════════════ */
const snapshots  = new Map();
const changeLogs = new Map();

function detectChanges(prevRows, currRows, headers) {
  const added = [], deleted = [], updated = [];
  const prevMap = new Map(prevRows.map(r => [r._rowIndex, r]));
  const currMap = new Map(currRows.map(r => [r._rowIndex, r]));

  for (const [idx, cur] of currMap) {
    const prev = prevMap.get(idx);
    if (!prev) { added.push({ rowIndex: idx, row: cur }); }
    else {
      const diffs = headers
        .filter(h => String(prev[h] ?? '') !== String(cur[h] ?? ''))
        .map(h => ({ col: h, old: prev[h] ?? '', new: cur[h] ?? '' }));
      if (diffs.length) updated.push({ rowIndex: idx, diffs });
    }
  }
  for (const [idx, prev] of prevMap) {
    if (!currMap.has(idx)) deleted.push({ rowIndex: idx, row: prev });
  }
  return { added, deleted, updated, hasDiff: added.length > 0 || deleted.length > 0 || updated.length > 0 };
}

function pushChangeLog(key, log) {
  if (!changeLogs.has(key)) changeLogs.set(key, []);
  const arr = changeLogs.get(key);
  arr.unshift(log);
  if (arr.length > 50) arr.length = 50;
}

/* ══════════════════════════════════════
   WEBSOCKET
══════════════════════════════════════ */
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const token = new URLSearchParams(req.url?.split('?')[1] || '').get('token');
  try { ws._user = jwt.verify(token, JWT_SECRET); } catch { ws._user = null; }
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 30000);

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: new Date().toISOString() });
  wss.clients.forEach(ws => { if (ws.readyState === ws.OPEN) ws.send(msg); });
}

/* ══════════════════════════════════════
   SERVER CONFIG
══════════════════════════════════════ */
let serverConfig = {
  defaultSheetId:  process.env.DEFAULT_SHEET_ID || '',
  defaultRange:    process.env.DEFAULT_RANGE    || 'Sheet1',
  cacheTtlMs:      CACHE_TTL_MS,
  autoRefreshSecs: parseInt(process.env.AUTO_REFRESH_SECS || '60'),
  googleApiKey:    process.env.GOOGLE_API_KEY   || ''
};

let autoRefreshTimer = null;

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  if (serverConfig.autoRefreshSecs > 0 && serverConfig.defaultSheetId) {
    autoRefreshTimer = setInterval(
      () => fetchAndDetect(serverConfig.defaultSheetId, serverConfig.defaultRange, true),
      serverConfig.autoRefreshSecs * 1000
    );
  }
}

/* ── core fetch + detect ── */
async function fetchAndDetect(sheetId, range = 'Sheet1', bypassCache = false) {
  const cacheKey = `${sheetId}::${range}`;
  if (!bypassCache) {
    const hit = getCached(cacheKey);
    if (hit) return { ...hit, _cached: true };
  }

  let values = [];
  try {
    if (sheetId.startsWith('CSV::')) {
      const snap = snapshots.get(cacheKey);
      if (!snap) throw new Error('No CSV data found in server cache.');
      values = [snap.headers, ...snap.rows.map(r => snap.headers.map(h => r[h] ?? ''))];
    } else if (process.env.MS_CLIENT_ID && process.env.MS_TENANT_ID) {
      // Use Microsoft Graph API for Excel
      values = await fetchFromMSGraph(sheetId, range);
    } else {
      // Use Google Sheets API
      const response = await getSheetsClient().spreadsheets.values.get({ spreadsheetId: sheetId, range });
      values = response.data.values || [];
    }
  } catch (err) {
    throw new Error('Failed to fetch from data source: ' + (err.response?.data?.error?.message || err.message));
  }
  
  const headers = values[0] || [];
  const rows    = values.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 1 };
    headers.forEach((h, ci) => { obj[h] = row[ci] ?? ''; });
    return obj;
  });

  const payload = {
    headers, rows,
    meta: { sheetId, range, rowCount: rows.length, colCount: headers.length, fetchedAt: new Date().toISOString() },
  };

  const prevSnap = snapshots.get(cacheKey);
  if (prevSnap) {
    const diff = detectChanges(prevSnap.rows, rows, headers);
    if (diff.hasDiff) {
      const log = {
        id: `${Date.now()}`,
        detectedAt: new Date().toISOString(),
        sheetId, range,
        summary: { added: diff.added.length, deleted: diff.deleted.length, updated: diff.updated.length },
        details: diff,
      };
      pushChangeLog(cacheKey, log);
      payload.changeLog = log;
      broadcast('DATA_CHANGE', { sheetId, range, log });
    }
  }

  snapshots.set(cacheKey, { rows, headers, fetchedAt: payload.meta.fetchedAt });
  setCached(cacheKey, payload);
  broadcast('DATA_REFRESH', { meta: payload.meta });
  return payload;
}

/* ══════════════════════════════════════
   AUTH ROUTES
══════════════════════════════════════ */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => res.json({ user: req.user }));

/* ══════════════════════════════════════
   SHEETS ROUTES
══════════════════════════════════════ */
app.get('/api/sheets/data', authMiddleware, async (req, res) => {
  const { sheetId, range = 'Sheet1', noCache } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'sheetId is required' });
  if (noCache === '1' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can bypass cache' });
  try {
    res.json(await fetchAndDetect(sheetId, range, noCache === '1'));
  } catch (err) {
    console.error('[sheets/data]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sheets/meta', authMiddleware, adminOnly, async (req, res) => {
  const { sheetId } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'sheetId required' });
  try {
    const resp = await getSheetsClient().spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'spreadsheetId,properties.title,sheets.properties',
    });
    const { spreadsheetId, properties, sheets: tabs } = resp.data;
    res.json({
      spreadsheetId, title: properties.title,
      tabs: tabs.map(s => ({
        id: s.properties.sheetId, title: s.properties.title,
        index: s.properties.index,
        rows: s.properties.gridProperties.rowCount,
        cols: s.properties.gridProperties.columnCount,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/refresh', authMiddleware, adminOnly, async (req, res) => {
  const { sheetId, range = 'Sheet1' } = req.body;
  const sid = sheetId || serverConfig.defaultSheetId;
  if (!sid) return res.status(400).json({ error: 'sheetId required' });
  try {
    const data = await fetchAndDetect(sid, range, true);
    res.json({ message: 'Refreshed', meta: data.meta, changeLog: data.changeLog || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/changes', authMiddleware, async (req, res) => {
  const { sheetId, range = 'Sheet1', limit = '20' } = req.query;
  const sid = sheetId || serverConfig.defaultSheetId;
  if (!sid) return res.status(400).json({ error: 'sheetId required' });
  const key  = `${sid}::${range}`;
  const logs = changeLogs.get(key) || [];
  res.json({ logs: logs.slice(0, Math.min(parseInt(limit), 50)), total: logs.length });
});

app.delete('/api/sheets/cache', authMiddleware, adminOnly, (req, res) => {
  const count = cache.size; cache.clear();
  res.json({ message: `Cache cleared (${count} entries removed)` });
});

app.post('/api/sheets/csv', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { filename, headers, rows } = req.body;
    if (!headers || !rows) return res.status(400).json({ error: 'headers and rows required' });
    
    const sid = `CSV::${filename || 'upload'}`;
    const range = 'Sheet1';
    const cacheKey = `${sid}::${range}`;
    
    const payload = {
      headers, rows,
      meta: { sheetId: sid, range, rowCount: rows.length, colCount: headers.length, fetchedAt: new Date().toISOString() },
    };

    const prevSnap = snapshots.get(cacheKey);
    if (prevSnap) {
      const diff = detectChanges(prevSnap.rows, rows, headers);
      if (diff.hasDiff) {
        const log = {
          id: `${Date.now()}`, detectedAt: new Date().toISOString(),
          sheetId: sid, range,
          summary: { added: diff.added.length, deleted: diff.deleted.length, updated: diff.updated.length },
          details: diff,
        };
        pushChangeLog(cacheKey, log);
        payload.changeLog = log;
        broadcast('DATA_CHANGE', { sheetId: sid, range, log });
      }
    }

    snapshots.set(cacheKey, { rows, headers, fetchedAt: payload.meta.fetchedAt });
    setCached(cacheKey, payload);
    
    // Update server config to point to this CSV
    serverConfig.defaultSheetId = sid;
    serverConfig.defaultRange = range;
    
    broadcast('DATA_REFRESH', { meta: payload.meta });
    res.json({ message: 'CSV loaded successfully', meta: payload.meta, config: serverConfig });
  } catch (err) {
    console.error('[sheets/csv upload]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/config', authMiddleware, adminOnly, (req, res) => res.json({ config: serverConfig }));

app.post('/api/admin/config', authMiddleware, adminOnly, (req, res) => {
  ['defaultSheetId', 'defaultRange', 'cacheTtlMs', 'autoRefreshSecs', 'googleApiKey'].forEach(k => {
    if (req.body[k] !== undefined) serverConfig[k] = req.body[k];
  });
  if (req.body.cacheTtlMs) CACHE_TTL_MS = parseInt(req.body.cacheTtlMs);
  startAutoRefresh();
  res.json({ message: 'Config updated', config: serverConfig });
});

/* ── health check ── */
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

/* ══════════════════════════════════════
   LOCAL EXCEL FILE WATCHER (OneDrive)
══════════════════════════════════════ */
const LOCAL_FILE_PATH = process.env.LOCAL_EXCEL_PATH ||
  'C:\\Users\\HP\\OneDrive - lexdatalabs\\mk\\Test attendence system.xlsx';

let localFileData = null;        // { sheets: { sheetName: { headers, rows } }, fetchedAt, fileName }
let localFileSnapshot = null;    // previous parsed state for change detection

function parseLocalExcel(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook   = XLSX.read(fileBuffer, { type: 'buffer' });
    const result = { sheets: {}, fileName: path.basename(filePath), fetchedAt: new Date().toISOString() };

    workbook.SheetNames.forEach(name => {
      const ws      = workbook.Sheets[name];
      const jsonArr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      if (!jsonArr.length) { result.sheets[name] = { headers: [], rows: [] }; return; }

      const headers = jsonArr[0].map(h => String(h ?? '').trim());
      const rows    = jsonArr.slice(1).map((row, i) => {
        const obj = { _rowIndex: i + 1 };
        headers.forEach((h, ci) => { obj[h] = row[ci] !== undefined ? String(row[ci]) : ''; });
        return obj;
      });
      result.sheets[name] = { headers, rows };
    });

    return result;
  } catch (err) {
    console.error('[LocalFile] Parse error:', err.message);
    return null;
  }
}

function diffSheets(prev, curr) {
  const changes = [];
  if (!prev || !curr) return changes;
  Object.keys(curr.sheets).forEach(name => {
    const ps = prev.sheets[name];
    const cs = curr.sheets[name];
    if (!ps) { changes.push({ sheet: name, type: 'new_sheet' }); return; }
    const diff = detectChanges(ps.rows, cs.rows, cs.headers);
    if (diff.hasDiff) changes.push({ sheet: name, ...diff });
  });
  return changes;
}

function loadAndBroadcastLocalFile(filePath, isInitial = false) {
  const parsed = parseLocalExcel(filePath);
  if (!parsed) return;

  const sheetChanges = isInitial ? [] : diffSheets(localFileSnapshot, parsed);
  localFileSnapshot = parsed;
  localFileData     = parsed;

  if (sheetChanges.length > 0) {
    broadcast('LOCAL_FILE_CHANGE', { fileName: parsed.fileName, changes: sheetChanges, fetchedAt: parsed.fetchedAt });
    console.log(`[LocalFile] Change detected in: ${sheetChanges.map(c => c.sheet).join(', ')}`);
  }
  broadcast('LOCAL_FILE_REFRESH', { fileName: parsed.fileName, fetchedAt: parsed.fetchedAt, sheetNames: Object.keys(parsed.sheets) });
  if (isInitial) console.log(`[LocalFile] ✅ Loaded: ${parsed.fileName}  →  Sheets: ${Object.keys(parsed.sheets).join(', ')}`);
}

// Watch the file; poll every 3 seconds (OneDrive sync writes may not trigger native events)
if (fs.existsSync(LOCAL_FILE_PATH)) {
  loadAndBroadcastLocalFile(LOCAL_FILE_PATH, true);
  chokidar.watch(LOCAL_FILE_PATH, {
    persistent: true,
    usePolling: true,
    interval: 3000,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 500 },
  }).on('change', fp => {
    console.log(`[LocalFile] 🔄 File changed: ${path.basename(fp)}`);
    loadAndBroadcastLocalFile(fp);
  });
} else {
  console.warn(`[LocalFile] ⚠️  File not found at: ${LOCAL_FILE_PATH}`);
  console.warn(`[LocalFile]    Set LOCAL_EXCEL_PATH in .env or place the file at the expected location.`);
}

/* GET /api/localfile — return all sheets from the watched local Excel file */
app.get('/api/localfile', authMiddleware, (req, res) => {
  if (!localFileData) {
    return res.status(404).json({ error: 'Local Excel file not loaded. Check server logs for details.' });
  }
  const { sheet } = req.query;
  if (sheet) {
    const s = localFileData.sheets[sheet];
    if (!s) return res.status(404).json({ error: `Sheet "${sheet}" not found.` });
    return res.json({ fileName: localFileData.fileName, fetchedAt: localFileData.fetchedAt, sheetName: sheet, headers: s.headers, rows: s.rows });
  }
  res.json(localFileData);
});

/* GET /api/localfile/sheets — list available sheet names */
app.get('/api/localfile/sheets', authMiddleware, (req, res) => {
  if (!localFileData) return res.status(404).json({ error: 'Local Excel file not loaded.' });
  res.json({ fileName: localFileData.fileName, fetchedAt: localFileData.fetchedAt, sheets: Object.keys(localFileData.sheets) });
});

/* POST /api/localfile/refresh — force re-read */
app.post('/api/localfile/refresh', authMiddleware, adminOnly, (req, res) => {
  if (!fs.existsSync(LOCAL_FILE_PATH)) return res.status(404).json({ error: 'File not found on disk.' });
  loadAndBroadcastLocalFile(LOCAL_FILE_PATH);
  res.json({ message: 'Refreshed', fetchedAt: localFileData?.fetchedAt });
});

/* ══════════════════════════════════════
   START
══════════════════════════════════════ */
server.listen(PORT, () => {
  console.log(`\n✅  DataSheet Backend  →  http://localhost:${PORT}/api`);
  console.log(`    WebSocket         →  ws://localhost:${PORT}`);
  console.log(`    Admin: admin@example.com / admin123`);
  console.log(`    User:  user@example.com  / user123`);
  console.log(`    Local Excel file  →  ${LOCAL_FILE_PATH}\n`);
  startAutoRefresh();
});
