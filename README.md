# DataSheet — Live Intelligence Dashboard

A full-stack web application that connects to **Google Sheets**, detects data changes in real-time, and displays everything in a premium interactive dashboard with role-based access control.

---

## ✨ Features

| Layer | What's included |
|---|---|
| **Auth** | JWT login, bcrypt passwords, 8h token expiry |
| **RBAC** | Admin (full access) + User (read-only) roles |
| **Data Source** | Google Sheets API v4 (API key or Service Account) |
| **Caching** | In-memory cache with configurable TTL (default 60s) |
| **Change Detection** | Detects new rows, deleted rows, and updated cells |
| **Change Log** | Last 50 change events stored in memory, viewable in UI |
| **WebSocket** | Real-time push notifications on data change / refresh |
| **Dashboard** | 4 metric cards, data preview table, auto-generated bar charts |
| **Data Table** | Search, column filter, sort, pagination, CSV export |
| **Charts** | Bar / Line / Horizontal bar — custom axis & row count selection |
| **Admin Panel** | Configure sheet ID/range, TTL, auto-refresh, clear cache |
| **Rate Limiting** | 200 req / 15 min per IP on all `/api/` routes |
| **Security** | Helmet headers, CORS, no credentials in frontend |

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in at minimum one of:
- `GOOGLE_API_KEY` — for **public** Google Sheets
- `GOOGLE_SERVICE_ACCOUNT_JSON` — for **private** sheets (paste JSON as one line)

Also set a strong `JWT_SECRET`.

### 3. Start the server
```bash
node server.js
# or for auto-reload during development:
npx nodemon server.js
```

Open **http://localhost:3000**

---

## 🔐 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| User | `user@example.com` | `user123` |

> Admin sees the Settings panel; User sees read-only views only.

---

## 🔑 Getting a Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Sheets API**
3. Create credentials → **API Key**
4. Restrict it to the Sheets API
5. Paste it as `GOOGLE_API_KEY` in `.env`
6. Make sure your Google Sheet is set to **"Anyone with the link can view"**

### For private sheets (Service Account)
1. Create a **Service Account** in Cloud Console
2. Download the JSON key file
3. Share your sheet with the service account email
4. Paste the entire JSON (one line) as `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## 📡 REST API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login → JWT token |
| GET | `/api/auth/me` | Any | Current user info |
| GET | `/api/sheets/data` | Any | Fetch sheet data (cached) |
| GET | `/api/sheets/meta` | Admin | Sheet tabs metadata |
| POST | `/api/refresh` | Admin | Force cache-bypass fetch |
| GET | `/api/changes` | Any | Change log history |
| DELETE | `/api/sheets/cache` | Admin | Clear cache |
| GET | `/api/admin/config` | Admin | Read server config |
| POST | `/api/admin/config` | Admin | Update server config |

### Example: Fetch sheet data
```
GET /api/sheets/data?sheetId=YOUR_SHEET_ID&range=Sheet1
Authorization: Bearer <token>
```

### Example: Force refresh
```
POST /api/refresh
Authorization: Bearer <token>
Content-Type: application/json
{ "sheetId": "YOUR_SHEET_ID", "range": "Sheet1" }
```

---

## 🔄 WebSocket Events

Connect to `ws://localhost:3000?token=<JWT>` to receive:

| Event type | Payload | When |
|---|---|---|
| `DATA_CHANGE` | `{ sheetId, range, log }` | Changes detected |
| `DATA_REFRESH` | `{ meta }` | New data fetched |

---

## 📂 Project Structure

```
mk_lexv/
├── server.js        # Express + WebSocket backend
├── index.html       # SPA frontend shell
├── app.js           # Frontend logic (auth, charts, WS, RBAC)
├── style.css        # Premium dark glassmorphism design
├── package.json
├── .env.example     # Environment variable template
└── .env             # Your secrets (never commit this)
```

---

## 🌐 Deployment

### Backend (Railway / Render / AWS)
```bash
# Set environment variables in the hosting platform dashboard
# Start command:
node server.js
```

### Frontend
The frontend is served by Express from the same `server.js` — no separate deploy needed. For standalone Vercel/Netlify deploy, extract the HTML/CSS/JS files and point `API_BASE` to your backend URL.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GOOGLE_API_KEY` | — | API key for public sheets |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | — | Service account JSON string |
| `JWT_SECRET` | (insecure default) | **Change this in production!** |
| `JWT_EXPIRES` | `8h` | Token expiry |
| `PORT` | `3000` | Server port |
| `CLIENT_ORIGIN` | `*` | CORS allowed origin |
| `CACHE_TTL_MS` | `60000` | Cache time-to-live in ms |
| `DEFAULT_SHEET_ID` | — | Sheet for server-side auto-refresh |
| `DEFAULT_RANGE` | `Sheet1` | Default range |
| `AUTO_REFRESH_SECS` | `60` | Server-side auto-refresh interval |
