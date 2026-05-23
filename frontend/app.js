function switchView(viewId) {
  document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const viewEl = document.getElementById(`view-${viewId}`);
  if (viewEl) viewEl.classList.add('active');

  const navItem = Array.from(document.querySelectorAll('.nav-item')).find(el => {
    const txt = el.innerText.trim().toLowerCase();
    return txt === viewId.toLowerCase() ||
      ((viewId === 'profile' || viewId === 'emp-directory') && txt === 'employees') ||
      (viewId === 'general-settings' && txt === 'settings');
  });
  if (navItem) {
    navItem.classList.add('active');
    if (viewId === 'settings' || viewId === 'general-settings') {
      document.getElementById('settings-submenu').classList.add('open');
      document.querySelectorAll('.submenu-item').forEach(el => el.classList.remove('active'));
      const subItemText = viewId === 'settings' ? 'Roles & Permissions' : 'General Settings';
      const activeSub = Array.from(document.querySelectorAll('.submenu-item')).find(el => el.innerText.trim() === subItemText);
      if (activeSub) activeSub.classList.add('active');
    } else {
      document.getElementById('settings-submenu').classList.remove('open');
    }
  }

  const titles = {
    'dashboard': 'Attendance Dashboard',
    'attendance': 'Employee Attendance',
    'analytics': 'Analytics Overview',
    'profile': 'Employees',
    'emp-directory': 'Employees',
    'calendar': 'Calendar Module',
    'settings': 'Settings / Roles & Permissions',
    'general-settings': 'Settings / General Settings'
  };
  const titleEl = document.getElementById('view-title');
  if (titleEl) titleEl.innerText = titles[viewId] || 'Attendance Pro';

  if (viewId === 'emp-directory') {
    renderEmpDirectory();
  } else if (viewId === 'calendar') {
    if (window.renderCalendar) window.renderCalendar();
  }
}

// Mock data removed. UI will populate dynamically via renderDynamicData.

function renderPermissionsMatrix() {
  const tbody = document.getElementById('permissions-tbody');
  if (!tbody) return;

  const getBadge = (type) => {
    switch (type) {
      case 'full': return `<div class="perm-badge perm-full"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M5 13l4 4L19 7"/></svg> Full Access</div>`;
      case 'limit': return `<div class="perm-badge perm-limit"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Limited Access</div>`;
      case 'view': return `<div class="perm-badge perm-view"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> View Only</div>`;
      case 'no': return `<div class="perm-badge perm-no"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg> No Access</div>`;
    }
  };

  const rows = [
    { mod: 'Dashboard', s: 'full', a: 'full', v: 'view' },
    { mod: 'Employees', s: 'full', a: 'full', v: 'no' },
    { mod: 'Attendance', s: 'full', a: 'full', v: 'no' },
    { mod: 'Reports', s: 'full', a: 'full', v: 'view' },
    { mod: 'Calendar', s: 'full', a: 'limit', v: 'view' },
    { mod: 'Analytics', s: 'full', a: 'limit', v: 'view' },
    { mod: 'Settings', s: 'full', a: 'no', v: 'no' }
  ];

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="text-align:left; color:var(--text-main); font-size:0.85rem"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:0.5rem; vertical-align:text-bottom"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg> ${r.mod}</td>
      <td>${getBadge(r.s)}</td>
      <td>${getBadge(r.a)}</td>
      <td>${getBadge(r.v)}</td>
    </tr>
  `).join('');
}

function setupAvatarUpload() {
  const avatarEl = document.getElementById('employee-avatar');
  const uploadInput = document.getElementById('avatar-upload');
  const removeBtn = document.getElementById('avatar-remove');

  if (!avatarEl || !uploadInput || !removeBtn) return;

  avatarEl.addEventListener('click', () => uploadInput.click());

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        avatarEl.style.backgroundImage = `url(${event.target.result})`;
        const ph = avatarEl.querySelector('.avatar-placeholder');
        if (ph) ph.style.display = 'none';
        removeBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  removeBtn.addEventListener('click', () => {
    avatarEl.style.backgroundImage = 'none';
    const ph = avatarEl.querySelector('.avatar-placeholder');
    if (ph) ph.style.display = 'block';
    uploadInput.value = '';
    removeBtn.style.display = 'none';
  });
}

async function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON array of arrays, using raw: false to keep formatted date strings like "1-May"
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      if (jsonData.length < 2) throw new Error('File is empty or has no rows');

      const headers = jsonData[0];
      const rows = jsonData.slice(1).map((row, i) => {
        const obj = { _rowIndex: i + 1 };
        headers.forEach((h, ci) => { obj[h] = row[ci] ?? ''; });
        return obj;
      });

      console.log('Uploading data to backend...', headers.length, 'cols', rows.length, 'rows');
      const res = await apiFetch('/api/sheets/csv', 'POST', {
        filename: file.name,
        headers,
        rows
      });
      console.log('Upload successful', res);
      // Backend will broadcast DATA_REFRESH, which will update the UI automatically.
    } catch (err) {
      console.error('Failed to process Excel:', err);
      alert('Upload failed: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function saveGoogleConfig() {
  const apiKey = document.getElementById('config-api-key').value.trim();
  const sheetId = document.getElementById('config-sheet-id').value.trim();

  if (!apiKey || !sheetId) {
    return alert('Please enter both an API Key and a Sheet ID.');
  }

  const btn = document.querySelector('#view-general-settings .btn-primary');
  const oldText = btn.innerText;
  btn.innerText = 'Connecting...';

  try {
    const res = await apiFetch('/api/admin/config', 'POST', {
      googleApiKey: apiKey,
      defaultSheetId: sheetId,
      defaultRange: 'Sheet1'
    });
    alert('✅ Connected successfully! The dashboard is now synced with your Google Sheet.');
    await refreshData(sheetId, 'Sheet1');
    switchView('dashboard');
  } catch (err) {
    alert('❌ Failed to connect: ' + err.message);
  } finally {
    btn.innerText = oldText;
  }
}

// Init
let STATE = { token: null, data: null, config: null };
const API_BASE = 'http://localhost:3000';

async function apiFetch(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function refreshLocalData() {
  try {
    const data = await apiFetch('/api/localfile');
    STATE.data = data;
    renderLocalDashboard(STATE.data);
  } catch (err) {
    console.warn('Local file not available yet:', err.message);
  }
}

/* ── Toast notification helper ── */
function showToast(message, type = 'success') {
  const toast = document.getElementById('refresh-toast');
  if (!toast) return;
  const colors = {
    success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)', color: '#22C55E' },
    error:   { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)',  color: '#EF4444' },
    info:    { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', color: '#8B5CF6' }
  };
  const c = colors[type] || colors.info;
  const icon = type === 'success'
    ? '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
    : type === 'error'
    ? '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>'
    : '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';

  toast.style.cssText = `position:fixed;bottom:2rem;right:2rem;z-index:9999;padding:0.75rem 1.25rem;border-radius:10px;font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:0.5rem;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.35);border:1px solid ${c.border};background:${c.bg};color:${c.color};opacity:0;transform:translateY(10px);transition:opacity 0.3s ease,transform 0.3s ease;`;
  toast.innerHTML = icon + message;

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Auto-hide after 3 seconds
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3000);
}

/* ── Refresh Dashboard ── */
window.refreshDashboard = async function() {
  const btn  = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');
  if (!btn || btn.disabled) return;

  // Spin the icon and disable button
  btn.disabled = true;
  btn.style.opacity = '0.7';
  if (icon) {
    icon.style.transition = 'transform 0.8s ease';
    icon.style.transform  = 'rotate(360deg)';
  }

  showToast('Refreshing data…', 'info');

  try {
    // Ask backend to force-reread the Excel file
    await apiFetch('/api/localfile/refresh', 'POST');
    // Pull the freshly parsed data
    await refreshLocalData();
    showToast('✓ Data refreshed successfully!', 'success');
  } catch (err) {
    console.warn('Refresh failed:', err.message);
    // If the local file endpoint fails, try the cached data
    try {
      await refreshLocalData();
      showToast('✓ Data reloaded from cache.', 'success');
    } catch (e) {
      showToast('⚠ Could not refresh data.', 'error');
    }
  } finally {
    // Re-enable button, reset icon after spin completes
    setTimeout(() => {
      btn.disabled = false;
      btn.style.opacity = '1';
      if (icon) {
        icon.style.transition = 'none';
        icon.style.transform  = 'rotate(0deg)';
      }
    }, 900);
  }
};

async function refreshData(sheetId, range = 'Sheet1') {
  try {
    const data = await apiFetch(`/api/sheets/data?sheetId=${encodeURIComponent(sheetId)}&range=${encodeURIComponent(range)}`);
    // Normalize format to match local file structure for the dashboard renderer
    STATE.data = {
      sheets: {
        [range]: { headers: data.headers, rows: data.rows }
      }
    };
    renderLocalDashboard(STATE.data);
  } catch (err) {
    console.error('Failed to fetch Google/CSV data:', err);
  }
}

async function initRealtime() {
  try {
    // Read auth from localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!storedToken) {
      window.location.href = 'index.html';
      return;
    }
    
    STATE.token = storedToken;
    let userRole = 'employee';
    try {
       const u = JSON.parse(storedUser);
       userRole = u.role;
       
       // Update UI with user info
       const userProfileName = document.querySelector('.user-profile-sm .font-weight-600') || document.querySelector('.user-profile-sm div[style*="font-weight:600"]');
       const userProfileEmail = document.querySelector('.user-profile-sm .text-muted') || document.querySelector('.user-profile-sm div[style*="var(--text-muted)"]');
       const userProfileAvatar = document.querySelector('.user-profile-sm .avatar');
       
       if (userProfileName) userProfileName.innerText = u.name;
       if (userProfileEmail) userProfileEmail.innerText = u.email;
       if (userProfileAvatar) userProfileAvatar.innerText = u.avatar;
       
       // Handle RBAC UI logic
       if (userRole === 'employee') {
          // Hide settings and directory for employees
          const settingsNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.innerText.includes('Settings'));
          if (settingsNav) settingsNav.style.display = 'none';
          
          const uploadBtn = document.querySelector('.btn-primary[onclick*="excel-upload"]');
          if (uploadBtn) uploadBtn.style.display = 'none';
       }
    } catch(e) {}

    try {
      const configRes = await apiFetch('/api/admin/config');
      STATE.config = configRes.config;
    } catch (e) {
      console.warn('Could not fetch config', e);
    }

    if (STATE.config && STATE.config.defaultSheetId) {
      await refreshData(STATE.config.defaultSheetId, STATE.config.defaultRange || 'Sheet1');
    } else {
      await refreshLocalData();
    }

    const ws = new WebSocket(`ws://localhost:3000?token=${STATE.token}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'LOCAL_FILE_REFRESH' || msg.type === 'LOCAL_FILE_CHANGE') {
        console.log('Local Excel update received:', msg);
        refreshLocalData();
      } else if (msg.type === 'DATA_REFRESH' || msg.type === 'DATA_CHANGE') {
        console.log('Google Sheet / CSV update received:', msg);
        const sid = msg.payload?.sheetId || (msg.payload?.meta?.sheetId);
        const rng = msg.payload?.range || (msg.payload?.meta?.range) || 'Sheet1';
        if (sid) {
          refreshData(sid, rng);
        } else if (STATE.config && STATE.config.defaultSheetId) {
          refreshData(STATE.config.defaultSheetId, STATE.config.defaultRange || 'Sheet1');
        }
      }
    };
    ws.onopen = () => console.log('WebSocket connected for live updates');
    ws.onclose = () => setTimeout(initRealtime, 5000);
  } catch (err) {
    console.error('Real-time init failed:', err);
  }
}

let activeMatrixFilter = null;

/**
 * Central attendance status parser.
 * In this Excel: blank = Present, Late(...) = Late, WFH = WFH,
 * Sick/Absent/Casual/Leave = Absent, Friday/Saturday = Weekend (skip).
 * Returns: 'P' | 'L' | 'A' | 'WFH' | 'WEEKEND' | ''
 */
function getStatus(rawVal) {
  const v = String(rawVal || '').trim().toUpperCase();
  if (v === 'FRIDAY' || v === 'SATURDAY') return 'WEEKEND';
  if (v === 'WFH') return 'WFH';
  if (v === 'L' || v === 'LATE' || v.startsWith('LATE(') || v.startsWith('LATE ')) return 'L';
  if (v === 'P' || v === 'PRESENT') return 'P';
  if (v === 'A' || v === 'ABSENT' || v.startsWith('SICK') || v.startsWith('CASUAL') ||
      v.includes('LEAVE') || v.includes('SICK')) return 'A';
  // Blank = Present (employee was present but not marked with a status code)
  if (!v || v === '-') return 'P';
  // Anything else (picnic day, early leave, etc.) treat as other absent-type
  return 'A';
}

function filterByStatus(status) {
  // If clicking same status, clear it
  if (activeMatrixFilter === status) activeMatrixFilter = null;
  else activeMatrixFilter = status;

  const clearBtn = document.getElementById('clear-filter');
  if (clearBtn) clearBtn.style.display = activeMatrixFilter ? 'block' : 'none';

  // Update button active states
  document.querySelectorAll('.legend-item').forEach(el => {
    const btnStatus = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (btnStatus === activeMatrixFilter && activeMatrixFilter !== null) {
      el.classList.add('active-filter');
    } else {
      el.classList.remove('active-filter');
    }
  });

  renderLocalDashboard(STATE.data);
}

function renderLocalDashboard(data) {
  if (!data || !data.sheets) return;

  const sheetNames = Object.keys(data.sheets);

  // ── Populate month dropdown from actual sheet names ──
  const ds = document.querySelector('.date-selector');
  if (ds) {
    // Filter to only real month sheets (skip fingerprint / leave list)
    const monthSheets = sheetNames.filter(n => {
      const low = n.toLowerCase();
      return !low.includes('fingerprint') && low !== 'leave list';
    });

    const prevValue = ds.value;
    ds.innerHTML = monthSheets.map(n => `<option value="${n}"${n === prevValue ? ' selected' : ''}>${n}</option>`).join('');

    // If previous selection gone, try to auto-select the latest non-empty sheet
    if (!monthSheets.includes(prevValue)) {
      const nonEmpty = [...monthSheets].reverse().find(n => data.sheets[n]?.rows?.length > 0);
      if (nonEmpty) ds.value = nonEmpty;
    }
  }

  const currentMonth = ds?.value || sheetNames[0];
  const targetSheet = data.sheets[currentMonth];

  if (!targetSheet) return;

  const { headers, rows } = targetSheet;
  const total = rows.length;
  document.getElementById('stat-total').innerText = total;

  // ── Render Attendance Matrix ──
  renderMatrix(targetSheet, currentMonth);

  // ... (rest of the stats calculation remains the same)
  // Use last date column available (most recent day) for today's stats
  let p = 0, l = 0, a = 0;
  // Find the rightmost date column that has at least some data
  const dateCols = headers.slice(2);
  const lastFilledCol = [...dateCols].reverse().find(h =>
    rows.some(r => { const s = getStatus(r[h]); return s !== '' && s !== 'WEEKEND'; })
  ) || dateCols[dateCols.length - 1];
  if (lastFilledCol) {
    rows.forEach(r => {
      const s = getStatus(r[lastFilledCol]);
      if (s === 'P' || s === 'WFH') p++;
      else if (s === 'L') l++;
      else if (s === 'A') a++;
    });
  }

  const pPct = n => total > 0 ? `${Math.round(n / total * 100)}% of total` : '—';
  const rate = total > 0 ? `${Math.round(p / total * 100)}%` : '—';
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setEl('stat-present', p); setEl('stat-late', l); setEl('stat-absent', a);
  setEl('stat-present-pct', pPct(p)); setEl('stat-late-pct', pPct(l)); setEl('stat-absent-pct', pPct(a));
  setEl('an-rate', rate); setEl('an-present', p); setEl('an-late', l); setEl('an-absent', a);

  const recentTable = document.getElementById('recent-table-body');
  if (recentTable) {
    const displayCols = headers.slice(0, 5);
    recentTable.innerHTML = rows.slice(0, 8).map(row => `
      <tr>
        ${displayCols.map(col => {
      let v = row[col] || '';
      if (v === 'P' || v === 'Present') v = '<span class="badge badge-P">P</span>';
      if (v === 'L' || v === 'Late') v = '<span class="badge badge-L">L</span>';
      if (v === 'A' || v === 'Absent') v = '<span class="badge badge-A">A</span>';
      return `<td>${v}</td>`;
    }).join('')}
      </tr>
    `).join('');
  }

  if (STATE.currentProfile) {
    viewEmployeeProfile(STATE.currentProfile.sl, STATE.currentProfile.name, true);
  }
  renderEmployeeList();
  if (window.renderCalendar) window.renderCalendar();
  // Keep directory KPI cards live
  const dirView = document.getElementById('view-emp-directory');
  if (dirView && dirView.classList.contains('active')) renderEmpDirectory();
}

function renderMatrix(sheet, monthName) {
  const head = document.getElementById('matrix-head');
  const body = document.getElementById('matrix-body');
  if (!head || !body) return;

  const { headers, rows } = sheet;
  const cols = headers; // Show all columns in the sheet!

  // Add "Total" header if filtered
  let headHtml = `<th>Employee</th>` + cols.slice(1).map(h => `<th>${h}</th>`).join('');
  if (activeMatrixFilter) {
    headHtml += `<th style="color:var(--purple); border-left: 2px solid var(--border)">TOTAL ${activeMatrixFilter}</th>`;
  }
  head.innerHTML = headHtml;

  body.innerHTML = rows.map(r => {
    let filterCount = 0;
    const cellsHtml = cols.slice(1).map((h, i) => {
      const rawV = r[h] || '';
      const v = String(rawV).toUpperCase();

      // Make the Name column clickable to view the profile
      if (i === 0) {
        const safeName = String(rawV).replace(/'/g, "\\'");
        const safeSl = String(r[headers[0]] || '');
        return `<td style="cursor:pointer; color:var(--purple); font-weight:600; white-space:nowrap; text-decoration:underline;" onclick="viewEmployeeProfile('${safeSl}', '${safeName}')" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--purple)'">${rawV || '-'}</td>`;
      }

      let cls = '';
      let isMatch = false;

      const st = getStatus(rawV);
      if (st === 'P') { cls = 'badge-P'; if (activeMatrixFilter === 'P') isMatch = true; }
      else if (st === 'L') { cls = 'badge-L'; if (activeMatrixFilter === 'L') isMatch = true; }
      else if (st === 'A') { cls = 'badge-A'; if (activeMatrixFilter === 'A') isMatch = true; }
      else if (st === 'WFH') { cls = 'badge-WFH'; if (activeMatrixFilter === 'WFH') isMatch = true; }
      else if (st === 'WEEKEND') { cls = 'badge-WFH'; }

      if (isMatch) filterCount++;

      // Dim non-matching cells if a filter is active
      const opacity = (!activeMatrixFilter || isMatch) ? 1 : 0.15;
      const highlight = (activeMatrixFilter && isMatch) ? 'box-shadow: 0 0 10px var(--purple)' : '';

      return `<td><div class="matrix-cell ${cls}" style="opacity: ${opacity}; ${highlight}">${rawV || '-'}</div></td>`;
    }).join('');

    let totalColHtml = '';
    if (activeMatrixFilter) {
      totalColHtml = `<td style="font-weight:700; color:var(--purple); text-align:center; border-left: 2px solid var(--border); background:rgba(139,92,246,0.05)">${filterCount}</td>`;
    }

    return `<tr><td style="font-weight:600; color:#fff">${r[headers[0]] || '—'}</td>${cellsHtml}${totalColHtml}</tr>`;
  }).join('');
}

window.onload = () => {
  renderPermissionsMatrix();
  setupAvatarUpload();
  switchView('dashboard');
  initRealtime();

  // Update matrix when month selector changes
  const ds = document.querySelector('.date-selector');
  if (ds) ds.onchange = () => renderLocalDashboard(STATE.data);

  // Real-time update for active profile
  if (STATE.currentProfile) {
    viewEmployeeProfile(STATE.currentProfile.sl, STATE.currentProfile.name, true);
  }
  renderEmployeeList();
};

/* ── Employee List (left panel) ── */
function renderEmployeeList(filter) {
  filter = (filter || '').toLowerCase();
  const listBody = document.getElementById('emp-list-body');
  const countBadge = document.getElementById('emp-total-count');
  if (!listBody) return;

  if (!STATE.data || !STATE.data.sheets) {
    listBody.innerHTML = '<div class="emp-list-placeholder">Upload a sheet to view employees.</div>';
    return;
  }

  const sheetNames = Object.keys(STATE.data.sheets);
  const ds = document.querySelector('.date-selector');
  let active = ds ? ds.value : '';
  if (!sheetNames.includes(active)) {
    active = sheetNames.find(n => n.toLowerCase() !== 'leave list' && STATE.data.sheets[n].rows.length > 0) || sheetNames[0];
  }

  const sheet = STATE.data.sheets[active];
  if (!sheet || !sheet.rows.length) {
    listBody.innerHTML = '<div class="emp-list-placeholder">No employees in this sheet.</div>';
    return;
  }

  const slCol = sheet.headers[0];
  const nameCol = sheet.headers[1];
  let emps = sheet.rows.filter(r => r[nameCol] && String(r[nameCol]).trim());
  if (filter) emps = emps.filter(r => String(r[nameCol]).toLowerCase().includes(filter));

  if (countBadge) countBadge.textContent = emps.length;

  if (!emps.length) {
    listBody.innerHTML = '<div class="emp-list-placeholder">No employees match.</div>';
    return;
  }

  listBody.innerHTML = emps.map(emp => {
    const id = String(emp[slCol] || '');
    const fullName = String(emp[nameCol] || '');
    const initials = fullName.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    const sel = STATE.currentProfile && String(STATE.currentProfile.sl) === id ? ' selected' : '';
    const safeName = fullName.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const avatarData = localStorage.getItem('avatar-' + id);
    const avatarStyle = avatarData ? `background-image: url(${avatarData}); background-size: cover; background-position: center; color: transparent;` : '';
    return `<div class="emp-list-item${sel}" onclick="viewEmployeeProfile('${id}','${safeName}')">
      <div class="emp-list-avatar" style="${avatarStyle}">${avatarData ? '' : initials}</div>
      <div><div class="emp-list-name">${fullName}</div><div class="emp-list-id">ID: ${id}</div></div>
    </div>`;
  }).join('');
  
  // Auto-select first employee if none is active to keep details populated
  if (emps.length && !STATE.currentProfile) {
    const first = emps[0];
    const id = String(first[slCol] || '');
    const name = String(first[nameCol] || '');
    const safeName = name.replace(/'/g, "\\'");
    viewEmployeeProfile(id, safeName, true);
  }
}

window.filterEmpList = function(val) { renderEmployeeList(val); };

/* ── Employee Profile (right panel) ── */
window.viewEmployeeProfile = function (sl, name, autoUpdate) {
  if (!autoUpdate) switchView('profile');
  STATE.currentProfile = { sl, name };

  // Show profile, hide empty state
  const emptyState = document.getElementById('emp-empty-state');
  const content    = document.getElementById('emp-profile-content');
  if (emptyState) emptyState.style.display = 'none';
  if (content)    content.style.display = 'block';

  // Highlight in list
  document.querySelectorAll('.emp-list-item').forEach(el => {
    const idDiv = el.querySelector('.emp-list-id');
    el.classList.toggle('selected', idDiv && idDiv.textContent === 'ID: ' + sl);
  });

  // Avatar initials and custom photo
  const initials = name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  const avatarEl = document.getElementById('prof-avatar-circle');
  const removeBtn = document.getElementById('btn-remove-avatar');
  const avatarData = localStorage.getItem('avatar-' + sl);
  if (avatarEl) {
    if (avatarData) {
      avatarEl.style.backgroundImage = `url(${avatarData})`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
      if (removeBtn) removeBtn.style.display = 'block';
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.textContent = initials;
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }
  const nameEl = document.getElementById('prof-name');
  const idEl   = document.getElementById('prof-id');
  if (nameEl) nameEl.textContent = name;
  if (idEl)   idEl.textContent   = 'Employee ID: ' + sl;

  let p = 0, l = 0, a = 0, wfh = 0, total = 0;
  let historyHtml = '';

  if (STATE.data && STATE.data.sheets) {
    const sheetNames = Object.keys(STATE.data.sheets);
    const dsEl = document.querySelector('.date-selector');
    let active = dsEl ? dsEl.value : '';
    if (!sheetNames.includes(active)) {
      active = sheetNames.find(n => n.toLowerCase() !== 'leave list' && STATE.data.sheets[n].rows.length > 0) || sheetNames[0];
    }

    const monthLabel = document.getElementById('prof-month-label');
    if (monthLabel) monthLabel.textContent = active;

    const sheet = STATE.data.sheets[active];
    if (sheet) {
      const slCol = sheet.headers[0];
      const row   = sheet.rows.find(r => String(r[slCol]) === String(sl));
      if (row) {
        sheet.headers.slice(2).forEach(date => {
          const raw = row[date] || '';
          const st = getStatus(raw);
          if (st === 'WEEKEND') return;
          total++;
          let badge = '', displayText = '';
          if (st === 'P')       { p++;   badge = 'badge-P';   displayText = raw || 'Present'; }
          else if (st === 'WFH') { wfh++; badge = 'badge-WFH'; displayText = 'WFH'; }
          else if (st === 'L')   { l++;   badge = 'badge-L';   displayText = raw; }
          else if (st === 'A')   { a++;   badge = 'badge-A';   displayText = raw || 'Absent'; }
          if (badge) historyHtml += `<tr><td style="color:var(--text-muted);font-size:0.82rem">${date}</td><td><span class="badge ${badge}" style="font-size:0.72rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;display:inline-block;white-space:nowrap;" title="${displayText}">${displayText}</span></td></tr>`;
        });
      }
    }
  }

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('prof-present', p);
  set('prof-late',    l);
  set('prof-absent',  a);
  set('prof-wfh',     wfh);

  const rate = total > 0 ? Math.round(((p + wfh + l) / total) * 100) : 0;
  set('prof-rate', total > 0 ? rate + '%' : '—');
  const fill = document.getElementById('prof-rate-fill');
  if (fill) setTimeout(() => { fill.style.width = rate + '%'; }, 50);
  const daysLabel = document.getElementById('prof-days-label');
  if (daysLabel) daysLabel.textContent = total + ' working days recorded this month';

  const tbody = document.getElementById('profile-history-body');
  if (tbody) tbody.innerHTML = historyHtml || '<tr><td colspan="2" style="color:var(--text-muted);text-align:center">No records found</td></tr>';
};

/* ── Dynamic Employee Operations & Avatar Management ── */
window.showAddEmployeeModal = function() {
  const modal = document.getElementById('add-emp-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('add-emp-id').value = '';
    document.getElementById('add-emp-name').value = '';
  }
};

window.hideAddEmployeeModal = function() {
  const modal = document.getElementById('add-emp-modal');
  if (modal) modal.style.display = 'none';
};

window.submitAddEmployee = async function() {
  const name = document.getElementById('add-emp-name').value.trim();

  if (!name) {
    return alert('Please enter a Full Name.');
  }

  if (!STATE.data || !STATE.data.sheets) {
    return alert('No sheet data loaded. Please upload an Excel sheet first.');
  }

  try {
    const token = localStorage.getItem('token') || '';
    const res = await fetch('http://localhost:3000/api/localfile/employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add employee');

    hideAddEmployeeModal();
    alert(`✅ Employee "${name}" added successfully!`);

    // Reload the data locally to show the change
    setTimeout(() => {
      fetch('http://localhost:3000/api/localfile/refresh', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }, 600);

  } catch (err) {
    alert(err.message);
  }
};

window.deleteEmployee = async function() {
  if (!STATE.currentProfile) return;
  const { sl, name } = STATE.currentProfile;
  
  if (!confirm(`Are you sure you want to completely remove ${name} (ID: ${sl}) from the system? This action cannot be undone.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`http://localhost:3000/api/localfile/employee/${sl}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete employee');

    alert(`🗑️ Employee "${name}" deleted successfully.`);

    // Hide profile panel since employee is gone
    document.getElementById('emp-profile-content').style.display = 'none';
    document.getElementById('emp-empty-state').style.display = 'flex';
    STATE.currentProfile = null;

    // Reload the data
    setTimeout(() => {
      fetch('http://localhost:3000/api/localfile/refresh', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }, 600);

  } catch (err) {
    alert(err.message);
  }
};

window.editEmployeeName = async function() {
  if (!STATE.currentProfile) return;
  const { sl, name } = STATE.currentProfile;

  const newName = prompt(`Enter new name for ${name} (ID: ${sl}):`, name);
  if (!newName || !newName.trim() || newName.trim() === name) return;

  try {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`http://localhost:3000/api/localfile/employee/${sl}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim() })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to update employee name');

    // Update in frontend memory so it reflects instantly before WS reload
    if (STATE.currentProfile && String(STATE.currentProfile.sl) === String(sl)) {
      STATE.currentProfile.name = newName.trim();
      const nameEl = document.getElementById('prof-name');
      if (nameEl) nameEl.textContent = newName.trim();
    }
    
    // Trigger standard reload pipeline
    setTimeout(() => {
      fetch('http://localhost:3000/api/localfile/refresh', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }, 600);

  } catch (err) {
    alert(err.message);
  }
};

window.handleAvatarUpload = function(event) {
  if (!STATE.currentProfile) return;
  const { sl, name } = STATE.currentProfile;
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    return alert('Please select a valid image file.');
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Data = e.target.result;
    localStorage.setItem('avatar-' + sl, base64Data);
    
    // Update avatar UI
    const avatarEl = document.getElementById('prof-avatar-circle');
    const removeBtn = document.getElementById('btn-remove-avatar');
    if (avatarEl) {
      avatarEl.style.backgroundImage = `url(${base64Data})`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
    }
    if (removeBtn) removeBtn.style.display = 'block';

    // Refresh employee list to show new photo
    renderEmployeeList();
  };
  reader.readAsDataURL(file);
};

window.removeAvatar = function() {
  if (!STATE.currentProfile) return;
  const { sl, name } = STATE.currentProfile;

  if (!confirm(`Are you sure you want to remove the photo for "${name}"?`)) {
    return;
  }

  localStorage.removeItem('avatar-' + sl);

  const initials = name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  const avatarEl = document.getElementById('prof-avatar-circle');
  const removeBtn = document.getElementById('btn-remove-avatar');
  const uploadInput = document.getElementById('prof-avatar-upload');

  if (avatarEl) {
    avatarEl.style.backgroundImage = 'none';
    avatarEl.textContent = initials;
  }
  if (removeBtn) removeBtn.style.display = 'none';
  if (uploadInput) uploadInput.value = '';

  renderEmployeeList();
};

/* ── Calendar Module Logic ── */
let CALENDAR_STATE = {
  year: 2026,
  monthName: '',
  selectedDay: null,
  searchFilter: '',
  employeeFilterId: null
};

window.navigateCalendarMonth = function(direction) {
  if (!STATE.data || !STATE.data.sheets) return;
  const sheetNames = Object.keys(STATE.data.sheets).filter(n => {
    const low = n.toLowerCase();
    return !low.includes('fingerprint') && low !== 'leave list';
  });

  const ds = document.querySelector('.date-selector');
  if (!ds) return;

  const currentIdx = sheetNames.indexOf(ds.value);
  if (currentIdx === -1) return;

  let newIdx = currentIdx + direction;
  if (newIdx < 0) newIdx = sheetNames.length - 1;
  if (newIdx >= sheetNames.length) newIdx = 0;

  ds.value = sheetNames[newIdx];
  renderLocalDashboard(STATE.data);
};

window.renderCalendar = function() {
  const grid = document.getElementById('calendar-days-grid');
  const monthTitle = document.getElementById('cal-month-title');
  if (!grid || !monthTitle) return;

  if (!STATE.data || !STATE.data.sheets) {
    grid.innerHTML = '<div style="grid-column: span 7; text-align:center; color:var(--text-muted); padding:3rem 0;">Upload a sheet to view calendar</div>';
    return;
  }

  const sheetNames = Object.keys(STATE.data.sheets);
  const ds = document.querySelector('.date-selector');
  let activeMonth = ds ? ds.value : '';
  if (!sheetNames.includes(activeMonth)) {
    activeMonth = sheetNames.find(n => n.toLowerCase() !== 'leave list' && STATE.data.sheets[n].rows.length > 0) || sheetNames[0];
  }

  const sheet = STATE.data.sheets[activeMonth];
  const headers = sheet ? sheet.headers : [];
  let rows = sheet ? sheet.rows : [];

  let monthlyP = 0, monthlyL = 0, monthlyA = 0, monthlyW = 0;

  if (CALENDAR_STATE.employeeFilterId && headers.length) {
    const slCol = headers[0];
    rows = rows.filter(r => String(r[slCol] || '').trim() === String(CALENDAR_STATE.employeeFilterId));
    
    // Compute monthly totals for the title
    if (rows.length > 0) {
      const empRow = rows[0];
      headers.slice(2).forEach(h => {
        const s = getStatus(empRow[h]);
        if (s === 'P')       monthlyP++;
        else if (s === 'WFH') monthlyW++;
        else if (s === 'L')   monthlyL++;
        else if (s === 'A')   monthlyA++;
      });
    }
  }

  CALENDAR_STATE.monthName = activeMonth;
  if (CALENDAR_STATE.employeeFilterId) {
    monthTitle.innerHTML = `${activeMonth} — <span style="color:var(--purple);">${CALENDAR_STATE.searchFilter}</span> <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted); margin-left:0.5rem;">(Present: ${monthlyP}, Late: <span style="color:var(--yellow);">${monthlyL}</span>, Absent: <span style="color:var(--red);">${monthlyA}</span>, WFH: <span style="color:var(--purple);">${monthlyW}</span>)</span>`;
  } else {
    monthTitle.textContent = activeMonth;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // Try exact match first, then case-insensitive, then partial match
  let monthIdx = monthNames.indexOf(activeMonth);
  if (monthIdx === -1) {
    monthIdx = monthNames.findIndex(m => m.toLowerCase() === activeMonth.toLowerCase());
  }
  if (monthIdx === -1) {
    monthIdx = monthNames.findIndex(m => activeMonth.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(activeMonth.toLowerCase()));
  }
  // Last resort: use current real month so we at least render something
  if (monthIdx === -1) {
    monthIdx = new Date().getMonth();
  }
  const year = CALENDAR_STATE.year || new Date().getFullYear();
  // Update year badge in the UI
  const yearBadge = document.getElementById('cal-year-badge');
  if (yearBadge) yearBadge.textContent = year;

  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  const startDayOfWeek = new Date(year, monthIdx, 1).getDay();

  let gridHtml = '';

  for (let i = 0; i < startDayOfWeek; i++) {
    gridHtml += `<div class="cal-day-cell outside"></div>`;
  }

  let matchedFirstDayHeader = null;
  
  const findDateHeaderStr = (day) => {
    const dayStr = String(day);
    const monthShort = activeMonth.substring(0, 3).toLowerCase();
    const monthNum = String(monthIdx + 1);
    const monthNumPad = monthNum.padStart(2, '0');
    const dayPad = dayStr.padStart(2, '0');

    return headers.find(h => {
      const low = String(h).toLowerCase();
      return (
        low === `${dayStr}-${monthShort}` ||
        low === `${dayPad}-${monthShort}` ||
        low === `${dayStr}/${monthNum}` ||
        low === `${dayPad}/${monthNumPad}` ||
        low.includes(`${dayStr}-${monthShort}`) ||
        low.includes(`${dayPad}-${monthShort}`) ||
        low.includes(`${dayStr}/${monthNum}`) ||
        low.includes(`${dayPad}/${monthNumPad}`) ||
        low === dayStr ||
        low === dayPad
      );
    });
  };

  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = (startDayOfWeek + day - 1) % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    
    const dateHeader = findDateHeaderStr(day);
    
    let p = 0, l = 0, a = 0, w = 0;
    let hasRecord = false;
    
    if (dateHeader && rows.length > 0) {
      hasRecord = true;
      rows.forEach(r => {
        const s = getStatus(r[dateHeader]);
        if (s === 'P')        p++;
        else if (s === 'WFH') w++;
        else if (s === 'L')   l++;
        else if (s === 'A')   a++;
        // WEEKEND is skipped
      });
    }

    const weekendClass = isWeekend ? ' weekend' : '';
    const activeClass = CALENDAR_STATE.selectedDay && CALENDAR_STATE.selectedDay.day === day ? ' active' : '';

    if (day === 1 && dateHeader) {
      matchedFirstDayHeader = dateHeader;
    }

    let dotsHtml = '';
    if (hasRecord && (p > 0 || l > 0 || a > 0 || w > 0)) {
      if (p > 0) dotsHtml += `<span class="cal-dot cal-dot-p" title="${p} Present"></span>`;
      if (l > 0) dotsHtml += `<span class="cal-dot cal-dot-l" title="${l} Late"></span>`;
      if (a > 0) dotsHtml += `<span class="cal-dot cal-dot-a" title="${a} Absent/Leave"></span>`;
      if (w > 0) dotsHtml += `<span class="cal-dot cal-dot-w" title="${w} WFH"></span>`;
    }

    gridHtml += `
      <div class="cal-day-cell${weekendClass}${activeClass}" onclick="selectCalendarDate(${day}, '${dateHeader || ''}')">
        <div class="cal-day-num">${day}</div>
        <div class="cal-day-dots">
          ${dotsHtml}
        </div>
      </div>
    `;
  }

  const totalCells = startDayOfWeek + totalDays;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    gridHtml += `<div class="cal-day-cell outside"></div>`;
  }

  grid.innerHTML = gridHtml;

  if (!CALENDAR_STATE.selectedDay || CALENDAR_STATE.selectedDay.month !== activeMonth) {
    if (matchedFirstDayHeader) {
      selectCalendarDate(1, matchedFirstDayHeader);
    } else {
      selectCalendarDate(1, '');
    }
  } else {
    selectCalendarDate(CALENDAR_STATE.selectedDay.day, CALENDAR_STATE.selectedDay.headerName, true);
  }
};

window.selectCalendarDate = function(day, headerName, skipHighlightRefresh) {
  CALENDAR_STATE.selectedDay = { day, headerName, month: CALENDAR_STATE.monthName };

  if (!skipHighlightRefresh) {
    document.querySelectorAll('#calendar-days-grid .cal-day-cell').forEach((cell, index) => {
      const startDayOfWeek = new Date(CALENDAR_STATE.year, ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(CALENDAR_STATE.monthName), 1).getDay();
      const cellDay = index + 1 - startDayOfWeek;
      cell.classList.toggle('active', cellDay === day);
    });
  }

  const detailTitle = document.getElementById('cal-detail-title');
  const detailSubtitle = document.getElementById('cal-detail-subtitle');
  if (detailTitle) detailTitle.textContent = `${day} ${CALENDAR_STATE.monthName}`;
  if (detailSubtitle) detailSubtitle.textContent = `Attendance record for ${CALENDAR_STATE.monthName} ${day}, ${CALENDAR_STATE.year}`;

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  
  if (!headerName || !STATE.data || !STATE.data.sheets) {
    setVal('cal-stat-p', '0');
    setVal('cal-stat-l', '0');
    setVal('cal-stat-a', '0');
    setVal('cal-stat-w', '0');
    const tbody = document.getElementById('calendar-details-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted); padding:3rem 0; font-size:0.82rem;">No attendance records found for this date.</td></tr>`;
    return;
  }

  const sheet = STATE.data.sheets[CALENDAR_STATE.monthName];
  if (!sheet) return;

  const slCol = sheet.headers[0];
  const nameCol = sheet.headers[1];
  let rows = sheet.rows;
  if (CALENDAR_STATE.employeeFilterId) {
    rows = rows.filter(r => String(r[slCol] || '').trim() === String(CALENDAR_STATE.employeeFilterId));
  }

  let p = 0, l = 0, a = 0, w = 0;

  rows.forEach(r => {
    const s = getStatus(r[headerName]);
    if (s === 'P')        p++;
    else if (s === 'WFH') w++;
    else if (s === 'L')   l++;
    else if (s === 'A')   a++;
  });

  setVal('cal-stat-p', p);
  setVal('cal-stat-l', l);
  setVal('cal-stat-a', a);
  setVal('cal-stat-w', w);

  window.renderCalendarLogsTable();
};

window.filterCalendarDetails = function(val) {
  CALENDAR_STATE.searchFilter = val;
  window.renderCalendarLogsTable();
};

window.renderCalendarLogsTable = function() {
  const tbody = document.getElementById('calendar-details-tbody');
  if (!tbody) return;

  const { monthName, selectedDay } = CALENDAR_STATE;
  if (!selectedDay || !selectedDay.headerName || !STATE.data || !STATE.data.sheets) return;

  const sheet = STATE.data.sheets[monthName];
  if (!sheet) return;

  const slCol = sheet.headers[0];
  const nameCol = sheet.headers[1];
  let rows = sheet.rows;

  if (CALENDAR_STATE.searchFilter) {
    const q = CALENDAR_STATE.searchFilter.toLowerCase();
    rows = rows.filter(r => String(r[nameCol] || '').toLowerCase().includes(q) || String(r[slCol] || '').toLowerCase().includes(q));
  }

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted); padding:3rem 0; font-size:0.82rem;">No matching logs found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const rawVal = r[selectedDay.headerName] || '';
    const v = String(rawVal).toUpperCase();
    const id = r[slCol] || '';
    const name = r[nameCol] || '';

    let badge = 'badge-A';
    let statusText = rawVal || 'Absent';
    
    const st = getStatus(rawVal);
    if (st === 'P')       { badge = 'badge-P';   statusText = rawVal || 'Present'; }
    else if (st === 'WFH')    { badge = 'badge-WFH'; statusText = 'WFH'; }
    else if (st === 'L')      { badge = 'badge-L';   statusText = rawVal; }
    else if (st === 'A')      { badge = 'badge-A';   statusText = rawVal || 'Absent'; }
    else if (st === 'WEEKEND'){ badge = 'badge-WFH'; statusText = rawVal; }

    const safeName = name.replace(/'/g,'&#39;');
    return `
      <tr class="cal-log-tr">
        <td style="padding:0.6rem 0.75rem; text-align:left; cursor:pointer;" onclick="viewEmployeeCalendar('${id}', '${safeName}')" title="View ${name}'s Calendar">
          <div style="font-weight:600; color:var(--purple); font-size:0.82rem; transition: color 0.2s;">${name}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.1rem;">ID: ${id}</div>
        </td>
        <td style="padding:0.6rem 0.75rem; text-align:right; vertical-align:middle;">
          <span class="badge ${badge}" style="font-size:0.72rem; padding:0.18rem 0.5rem; border-radius:5px; box-shadow:none;">${statusText}</span>
        </td>
      </tr>
    `;
  }).join('');
};

/* ─────────────────────────────────────
   EMPLOYEE DIRECTORY MODULE
───────────────────────────────────── */
const DIR = {
  page: 1,
  pageSize: 10,
  filter: '',
  view: 'list',   // 'list' | 'grid'
  allEmps: []
};

function getDirSheet() {
  if (!STATE.data || !STATE.data.sheets) return null;
  const ds = document.querySelector('.date-selector');
  let active = ds ? ds.value : '';
  const names = Object.keys(STATE.data.sheets);
  if (!names.includes(active)) {
    active = names.find(n => n.toLowerCase() !== 'leave list' && STATE.data.sheets[n].rows.length > 0) || names[0];
  }
  return { sheet: STATE.data.sheets[active], monthName: active };
}

function calcEmpStats(row, headers) {
  let p = 0, l = 0, a = 0, wfh = 0, total = 0, lastStatus = '';
  headers.slice(2).forEach(h => {
    const raw = row[h] || '';
    const st = getStatus(raw);
    if (st === 'WEEKEND') return;
    total++;
    if      (st === 'P')   { p++;   lastStatus = 'present'; }
    else if (st === 'WFH') { wfh++; lastStatus = 'wfh'; }
    else if (st === 'L')   { l++;   lastStatus = 'late'; }
    else if (st === 'A')   { a++;   lastStatus = 'absent'; }
    else total--;
  });
  const rate = total > 0 ? Math.round((p + wfh) / total * 100) : 0;
  return { p, l, a, wfh, total, rate, lastStatus };
}

function renderEmpDirectory() {
  const res = getDirSheet();
  if (!res || !res.sheet || !res.sheet.rows.length) {
    document.getElementById('dir-emp-tbody').innerHTML =
      '<tr><td colspan="8" class="dir-empty-cell">Upload a sheet to view employees.</td></tr>';
    ['dir-stat-total','dir-stat-present','dir-stat-leave','dir-stat-absent','dir-stat-wfh','dir-table-count']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    document.getElementById('dir-page-info').textContent = 'Showing 0–0 of 0 employees';
    document.getElementById('dir-page-nums').innerHTML = '';
    return;
  }

  const { sheet, monthName } = res;
  const slCol   = sheet.headers[0];
  const nameCol = sheet.headers[1];

  // Build employee list with stats
  DIR.allEmps = sheet.rows
    .filter(r => r[nameCol] && String(r[nameCol]).trim())
    .map(r => ({
      id:   String(r[slCol]   || ''),
      name: String(r[nameCol] || ''),
      stats: calcEmpStats(r, sheet.headers),
      avatar: localStorage.getItem('avatar-' + String(r[slCol] || ''))
    }));

  // KPI aggregates
  let kpiP = 0, kpiL = 0, kpiA = 0, kpiW = 0;
  DIR.allEmps.forEach(e => {
    if (e.stats.lastStatus === 'present') kpiP++;
    else if (e.stats.lastStatus === 'late') kpiL++;
    else if (e.stats.lastStatus === 'absent') kpiA++;
    else if (e.stats.lastStatus === 'wfh') kpiW++;
  });
  const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  sv('dir-stat-total',   DIR.allEmps.length);
  sv('dir-stat-present', kpiP);
  sv('dir-stat-leave',   kpiA);   // Absent/Leave combined in KPI
  sv('dir-stat-absent',  kpiL);   // Late shown as "Absent Today" KPI slot
  sv('dir-stat-wfh',     kpiW);

  _renderDirPage();
}

function _renderDirPage() {
  // Filter
  const q = DIR.filter.toLowerCase();
  const filtered = DIR.allEmps.filter(e =>
    !q || e.name.toLowerCase().includes(q) || e.id.includes(q)
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / DIR.pageSize));
  if (DIR.page > totalPages) DIR.page = totalPages;

  const start = (DIR.page - 1) * DIR.pageSize;
  const end   = Math.min(start + DIR.pageSize, total);
  const page  = filtered.slice(start, end);

  document.getElementById('dir-table-count').textContent = total;
  document.getElementById('dir-page-info').textContent =
    total === 0 ? 'No employees found' : `Showing ${start + 1}–${end} of ${total} employees`;

  // Render page numbers
  const numsEl = document.getElementById('dir-page-nums');
  let numsHtml = '';
  const maxShow = 5;
  let startPage = Math.max(1, DIR.page - Math.floor(maxShow / 2));
  let endPage   = Math.min(totalPages, startPage + maxShow - 1);
  if (endPage - startPage < maxShow - 1) startPage = Math.max(1, endPage - maxShow + 1);
  for (let i = startPage; i <= endPage; i++) {
    numsHtml += `<button class="dir-page-num${i === DIR.page ? ' active' : ''}" onclick="dirGoToPage(${i})">${i}</button>`;
  }
  numsEl.innerHTML = numsHtml;

  const prevBtn = document.getElementById('dir-prev-btn');
  const nextBtn = document.getElementById('dir-next-btn');
  if (prevBtn) prevBtn.disabled = DIR.page <= 1;
  if (nextBtn) nextBtn.disabled = DIR.page >= totalPages;

  if (DIR.view === 'grid') {
    _renderDirGrid(page);
  } else {
    _renderDirTable(page);
  }
}

const AVATAR_GRADS = ['g0','g1','g2','g3','g4','g5','g6','g7'];

function _getAvatarGrad(id) {
  const n = parseInt(id, 10) || 0;
  return AVATAR_GRADS[n % AVATAR_GRADS.length];
}

function _statusPill(status) {
  const map = {
    present: ['dir-pill-present', 'Present'],
    late:    ['dir-pill-late',    'Late'],
    absent:  ['dir-pill-absent',  'Absent'],
    wfh:     ['dir-pill-wfh',     'WFH'],
  };
  const [cls, label] = map[status] || ['dir-pill-none', 'No Record'];
  return `<span class="dir-pill ${cls}">${label}</span>`;
}

function _renderDirTable(page) {
  const wrap = document.getElementById('dir-table-wrap');
  const grid = document.getElementById('dir-emp-grid');
  if (wrap) wrap.style.display = 'block';
  if (grid) grid.style.display = 'none';

  const tbody = document.getElementById('dir-emp-tbody');
  if (!tbody) return;

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="dir-empty-cell">No employees match your search.</td></tr>';
    return;
  }

  tbody.innerHTML = page.map(e => {
    const initials  = e.name.split(' ').slice(0,2).map(w => w[0]||'').join('').toUpperCase();
    const gradClass = 'dir-avatar-' + _getAvatarGrad(e.id);
    const avatarStyle = e.avatar
      ? `background-image:url(${e.avatar}); background-size:cover; background-position:center; color:transparent;`
      : '';
    const avatarContent = e.avatar ? '' : initials;
    const rateW = Math.min(100, e.stats.rate);
    const safeName = e.name.replace(/'/g,'&#39;');

    return `<tr class="dir-tr">
      <td class="dir-td">
        <div class="dir-emp-cell" style="cursor:pointer;" onclick="event.stopPropagation(); viewEmployeeCalendar('${e.id}','${safeName}')" title="View ${e.name}'s Calendar">
          <div class="dir-emp-avatar ${avatarClass(e)}" style="${avatarStyle}">${avatarContent}</div>
          <div>
            <div class="dir-emp-name" style="color:var(--purple);">${e.name}</div>
            <div class="dir-emp-sub">Employee</div>
          </div>
        </div>
      </td>
      <td class="dir-td" onclick="viewEmployeeProfile('${e.id}','${safeName}')"><span class="dir-id-badge">#${e.id}</span></td>
      <td class="dir-td" onclick="viewEmployeeProfile('${e.id}','${safeName}')">${_statusPill(e.stats.lastStatus)}</td>
      <td class="dir-td" onclick="viewEmployeeProfile('${e.id}','${safeName}')" style="color:var(--green); font-weight:600;">${e.stats.p}</td>
      <td class="dir-td" onclick="viewEmployeeProfile('${e.id}','${safeName}')" style="color:var(--yellow); font-weight:600;">${e.stats.l}</td>
      <td class="dir-td" onclick="viewEmployeeProfile('${e.id}','${safeName}')" style="color:var(--red); font-weight:600;">${e.stats.a}</td>
      <td class="dir-td" onclick="viewEmployeeProfile('${e.id}','${safeName}')">
        <div class="dir-rate-wrap">
          <div class="dir-rate-track"><div class="dir-rate-fill" style="width:${rateW}%"></div></div>
          <span class="dir-rate-text">${e.stats.rate}%</span>
        </div>
      </td>
      <td class="dir-td">
        <div class="dir-actions">
          <button class="dir-act-btn dir-act-btn-view" onclick="event.stopPropagation(); viewEmployeeProfile('${e.id}','${safeName}')">View</button>
          <button class="dir-act-btn" style="color:var(--red); border-color:rgba(239,68,68,0.3);" onclick="event.stopPropagation(); removeEmployee('${e.id}', '${safeName}')">Remove</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function avatarClass(e) {
  return e.avatar ? '' : 'dir-avatar-' + _getAvatarGrad(e.id);
}

function _renderDirGrid(page) {
  const wrap = document.getElementById('dir-table-wrap');
  const grid = document.getElementById('dir-emp-grid');
  if (wrap) wrap.style.display = 'none';
  if (grid) grid.style.display = 'grid';

  if (!page.length) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:3rem;">No employees match.</div>';
    return;
  }

  grid.innerHTML = page.map(e => {
    const initials = e.name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
    const avatarStyle = e.avatar
      ? `background-image:url(${e.avatar}); background-size:cover; background-position:center; color:transparent;`
      : '';
    const safeName = e.name.replace(/'/g,'&#39;');

    return `<div class="dir-grid-card" style="position:relative;">
      <button class="dir-act-btn" style="position:absolute; top:8px; right:8px; color:var(--red); border:none; background:transparent; padding:0.2rem;" onclick="event.stopPropagation(); removeEmployee('${e.id}', '${safeName}')" title="Remove Employee">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      <div onclick="viewEmployeeCalendar('${e.id}','${safeName}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; width:100%;" title="View ${e.name}'s Calendar">
        <div class="dir-grid-avatar ${avatarClass(e)}" style="${avatarStyle}; margin-bottom:0.6rem;">${e.avatar ? '' : initials}</div>
        <div>
          <div class="dir-grid-name" style="color:var(--purple);">${e.name}</div>
          <div class="dir-grid-id">#${e.id}</div>
        </div>
      </div>
      <div onclick="viewEmployeeProfile('${e.id}','${safeName}')" style="cursor:pointer; width:100%; margin-top:0.3rem;">
        ${_statusPill(e.stats.lastStatus)}
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem;">Rate: <span style="color:var(--purple); font-weight:600;">${e.stats.rate}%</span></div>
      </div>
    </div>`;
  }).join('');
}

window.filterEmpDirectory = function(val) {
  DIR.filter = val;
  DIR.page   = 1;
  _renderDirPage();
};

window.dirChangePage = function(delta) {
  DIR.page += delta;
  _renderDirPage();
};

window.dirGoToPage = function(n) {
  DIR.page = n;
  _renderDirPage();
};

window.dirSetPageSize = function(val) {
  DIR.pageSize = parseInt(val, 10);
  DIR.page     = 1;
  _renderDirPage();
};

window.setDirView = function(mode) {
  DIR.view = mode;
  document.getElementById('dir-toggle-list')?.classList.toggle('active', mode === 'list');
  document.getElementById('dir-toggle-grid')?.classList.toggle('active', mode === 'grid');
  _renderDirPage();
};

/* ─────────────────────────────────────
   ADD / REMOVE EMPLOYEE API CALLS
───────────────────────────────────── */

window.showAddEmployeeModal = function() {
  document.getElementById('add-emp-name').value = '';
  document.getElementById('add-emp-modal').style.display = 'flex';
};

window.hideAddEmployeeModal = function() {
  document.getElementById('add-emp-modal').style.display = 'none';
};

window.submitAddEmployee = async function() {
  const name = document.getElementById('add-emp-name').value.trim();
  if (!name) return alert('Please enter the employee name.');

  const btn = document.querySelector('#add-emp-modal .btn-primary');
  const ogText = btn.innerText;
  btn.innerText = 'Adding...';
  btn.disabled = true;

  try {
    const res = await fetch('http://localhost:3000/api/localfile/employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed to add employee');
    
    hideAddEmployeeModal();
    // Re-trigger a fetch to get the updated data via standard pipeline
    setTimeout(() => {
      fetch('http://localhost:3000/api/localfile/refresh', { method: 'POST' })
        .catch(console.error);
    }, 600);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerText = ogText;
    btn.disabled = false;
  }
};

window.removeEmployee = async function(id, name) {
  if (!confirm(`Are you sure you want to completely remove ${name} (#${id}) from ALL sheets? This cannot be undone.`)) {
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/api/localfile/employee/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to remove employee');

    // Remove from UI immediately to feel snappy
    DIR.allEmps = DIR.allEmps.filter(e => e.id !== id);
    _renderDirPage();

    // Clear active profile panel if this employee was being viewed
    if (STATE.currentProfile && String(STATE.currentProfile.sl) === String(id)) {
      STATE.currentProfile = null;
      const emptyState = document.getElementById('emp-empty-state');
      const content    = document.getElementById('emp-profile-content');
      if (emptyState) emptyState.style.display = 'block';
      if (content)    content.style.display = 'none';
      renderEmployeeList();
    }

  } catch (err) {
    alert(err.message);
  }
};

window.viewEmployeeCalendar = function(id, name) {
  CALENDAR_STATE.employeeFilterId = id;
  CALENDAR_STATE.searchFilter = name;
  const searchInput = document.getElementById('cal-search-input');
  if (searchInput) searchInput.value = name;
  
  switchView('calendar');
  if (window.renderCalendar) window.renderCalendar();
  if (window.filterCalendarDetails) window.filterCalendarDetails(name);
};

window.clearEmployeeCalendarFilter = function() {
  CALENDAR_STATE.employeeFilterId = null;
  CALENDAR_STATE.searchFilter = '';
  const searchInput = document.getElementById('cal-search-input');
  if (searchInput) searchInput.value = '';
  if (window.renderCalendar) window.renderCalendar();
  if (window.filterCalendarDetails) window.filterCalendarDetails('');
};

