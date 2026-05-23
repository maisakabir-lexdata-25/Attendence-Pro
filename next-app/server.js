const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  
  // --- Copy of the old Express server logic ---
  server.use(cors({ origin: true, credentials: true }));
  server.use(express.json({ limit: '50mb' }));
  
  const USERS = [
    {
      id: 1, name: 'Super Admin', email: 'superadmin@example.com',
      password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', // admin123
      role: 'superadmin', avatar: 'SA',
    },
    {
      id: 2, name: 'Admin & Team Supervisor', email: 'admin@example.com',
      password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', // admin123
      role: 'admin', avatar: 'AU',
    },
    {
      id: 3, name: 'Employee User', email: 'employee@example.com',
      password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu', // user123
      role: 'employee', avatar: 'EU',
    },
  ];
  
  const JWT_SECRET  = process.env.JWT_SECRET  || 'change-this-secret-in-production';
  const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
  
  function signToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar },
      JWT_SECRET, { expiresIn: JWT_EXPIRES }
    );
  }
  
  server.post('/api/auth/login', async (req, res) => {
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

  // Example placeholder for local Excel logic
  const LOCAL_FILE_PATH = process.env.LOCAL_EXCEL_PATH || 'C:\\Users\\HP\\OneDrive - lexdatalabs\\mk\\Test attendence system.xlsx';
  let localFileData = null;
  
  function parseLocalExcel(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const result = { sheets: {}, fileName: path.basename(filePath), fetchedAt: new Date().toISOString() };
      workbook.SheetNames.forEach(name => {
        const ws = workbook.Sheets[name];
        const jsonArr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        if (!jsonArr.length) { result.sheets[name] = { headers: [], rows: [] }; return; }
        const headers = jsonArr[0].map(h => String(h ?? '').trim());
        const rows = jsonArr.slice(1).map((row, i) => {
          const obj = { _rowIndex: i + 1 };
          headers.forEach((h, ci) => { obj[h] = row[ci] !== undefined ? String(row[ci]) : ''; });
          return obj;
        });
        result.sheets[name] = { headers, rows };
      });
      return result;
    } catch (err) {
      return null;
    }
  }

  function loadLocalFile() {
    if (fs.existsSync(LOCAL_FILE_PATH)) {
      localFileData = parseLocalExcel(LOCAL_FILE_PATH);
    }
  }
  
  loadLocalFile();

  server.get('/api/localfile', (req, res) => {
    if (!localFileData) return res.status(404).json({ error: 'Not loaded' });
    res.json(localFileData);
  });

  // Next.js Catch-all
  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const httpServer = createServer(server);
  
  // WebSocket
  const wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'WELCOME', msg: 'Connected to Next.js Custom Server' }));
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
