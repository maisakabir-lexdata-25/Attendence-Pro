function switchView(viewId) {
  document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const viewEl = document.getElementById(`view-${viewId}`);
  if (viewEl) viewEl.classList.add('active');

  const navItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.innerText.trim().toLowerCase() === viewId.toLowerCase() || (viewId === 'profile' && el.innerText.trim() === 'Employees') || (viewId === 'general-settings' && el.innerText.trim() === 'Settings'));
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
    'profile': 'Employee Profile & Details',
    'calendar': 'Calendar Module',
    'settings': 'Settings / Roles & Permissions',
    'general-settings': 'Settings / General Settings'
  };
  const titleEl = document.getElementById('view-title');
  if (titleEl) titleEl.innerText = titles[viewId] || 'Attendance Pro';
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
    const loginRes = await apiFetch('/api/auth/login', 'POST', { email: 'admin@example.com', password: 'admin123' });
    STATE.token = loginRes.token;

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
  let p = 0, l = 0, a = 0;
  rows.forEach(r => {
    for (let h of headers) {
      const val = String(r[h] || '').toUpperCase();
      if (val === 'P' || val === 'PRESENT') { p++; break; }
      if (val === 'L' || val === 'LATE') { l++; break; }
      if (val === 'A' || val === 'ABSENT') { a++; break; }
    }
  });

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

      if (v === 'P' || v === 'PRESENT') { cls = 'badge-P'; if (activeMatrixFilter === 'P') isMatch = true; }
      else if (v.includes('LATE') || v === 'L') { cls = 'badge-L'; if (activeMatrixFilter === 'L') isMatch = true; }
      else if (v.includes('SICK') || v === 'A' || v === 'ABSENT') { cls = 'badge-A'; if (activeMatrixFilter === 'A') isMatch = true; }
      else if (v === 'WFH') { cls = 'badge-WFH'; if (activeMatrixFilter === 'WFH') isMatch = true; }
      else if (v === 'CL' || v.includes('CASUAL')) { cls = 'badge-WFH'; if (activeMatrixFilter === 'CL') isMatch = true; }

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
          const v   = String(raw).toUpperCase();
          if (!v || v === 'FRIDAY' || v === 'SATURDAY') return;
          total++;
          let badge = '';
          if (v === 'P' || v === 'PRESENT')                                     { p++;   badge = 'badge-P'; }
          else if (v === 'WFH')                                                   { wfh++; badge = 'badge-WFH'; }
          else if (v.includes('LATE') || v === 'L')                              { l++;   badge = 'badge-L'; }
          else if (v.includes('SICK')||v==='A'||v==='ABSENT'||v.includes('CASUAL')||v.includes('LEAVE')) { a++; badge = 'badge-A'; }
          else { total--; }
          if (badge) historyHtml += `<tr><td style="color:var(--text-muted);font-size:0.82rem">${date}</td><td><span class="badge ${badge}">${raw}</span></td></tr>`;
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

window.submitAddEmployee = function() {
  const id = document.getElementById('add-emp-id').value.trim();
  const name = document.getElementById('add-emp-name').value.trim();

  if (!id || !name) {
    return alert('Please enter both an Employee ID and a Full Name.');
  }

  if (!STATE.data || !STATE.data.sheets) {
    return alert('No sheet data loaded. Please upload an Excel sheet first.');
  }

  // Get active sheet
  const sheetNames = Object.keys(STATE.data.sheets);
  const ds = document.querySelector('.date-selector');
  let active = ds ? ds.value : '';
  if (!sheetNames.includes(active)) {
    active = sheetNames.find(n => n.toLowerCase() !== 'leave list' && STATE.data.sheets[n].rows.length > 0) || sheetNames[0];
  }

  const sheet = STATE.data.sheets[active];
  if (!sheet) return;

  const slCol = sheet.headers[0];
  const nameCol = sheet.headers[1];

  // Check if ID already exists
  const exists = sheet.rows.some(r => String(r[slCol]) === String(id));
  if (exists) {
    return alert(`An employee with ID "${id}" already exists in this sheet.`);
  }

  // Create new row
  const newRow = { _rowIndex: sheet.rows.length + 1 };
  sheet.headers.forEach(h => {
    newRow[h] = '';
  });
  newRow[slCol] = id;
  newRow[nameCol] = name;

  // Add weekdays default as P
  sheet.headers.slice(2).forEach(date => {
    const dUpper = date.toUpperCase();
    if (dUpper.includes('FRI') || dUpper.includes('FRIDAY')) {
      newRow[date] = 'Friday';
    } else if (dUpper.includes('SAT') || dUpper.includes('SATURDAY')) {
      newRow[date] = 'Saturday';
    } else {
      newRow[date] = '-';
    }
  });

  sheet.rows.push(newRow);
  hideAddEmployeeModal();
  renderLocalDashboard(STATE.data);
  renderEmployeeList();
  
  // Select the newly added employee profile
  viewEmployeeProfile(id, name);
  alert(`✅ Employee "${name}" (ID: ${id}) added successfully!`);
};

window.deleteEmployee = function() {
  if (!STATE.currentProfile) return;
  const { sl, name } = STATE.currentProfile;

  if (!confirm(`Are you sure you want to remove employee "${name}" (ID: ${sl}) from the database?`)) {
    return;
  }

  const sheetNames = Object.keys(STATE.data.sheets);
  const ds = document.querySelector('.date-selector');
  let active = ds ? ds.value : '';
  if (!sheetNames.includes(active)) {
    active = sheetNames.find(n => n.toLowerCase() !== 'leave list' && STATE.data.sheets[n].rows.length > 0) || sheetNames[0];
  }

  const sheet = STATE.data.sheets[active];
  if (!sheet) return;

  const slCol = sheet.headers[0];
  const originalLength = sheet.rows.length;
  sheet.rows = sheet.rows.filter(r => String(r[slCol]) !== String(sl));

  if (sheet.rows.length === originalLength) {
    return alert('Could not find employee row to delete.');
  }

  // Remove avatar from localStorage
  localStorage.removeItem('avatar-' + sl);

  // Clear current profile state
  STATE.currentProfile = null;
  const emptyState = document.getElementById('emp-empty-state');
  const content    = document.getElementById('emp-profile-content');
  if (emptyState) emptyState.style.display = 'block';
  if (content)    content.style.display = 'none';

  renderLocalDashboard(STATE.data);
  renderEmployeeList();
  alert(`🗑️ Employee "${name}" removed successfully.`);
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
