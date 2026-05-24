import sheetsApi from '@googleapis/sheets';

function getClient() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is not set');
  return sheetsApi.sheets({ version: 'v4', auth: key });
}

function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEET_ID is not set');
  return id;
}

function rowsToObjects(values) {
  if (!values || !values.length) return { headers: [], rows: [] };
  const headers = values[0].map(h => String(h ?? '').trim());
  const rows = values.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 1 };
    headers.forEach((h, ci) => { obj[h] = row[ci] !== undefined ? String(row[ci]) : ''; });
    return obj;
  });
  return { headers, rows };
}

export async function listSheets() {
  const sheets = getClient();
  const spreadsheetId = getSheetId();
  const resp = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties',
  });
  return {
    title: resp.data.properties?.title || '',
    sheetNames: (resp.data.sheets || []).map(s => s.properties.title),
  };
}

export async function getSheetData(sheetName) {
  const sheets = getClient();
  const spreadsheetId = getSheetId();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  return rowsToObjects(resp.data.values || []);
}

export async function getAllSheetsData() {
  const { title, sheetNames } = await listSheets();
  const sheets = getClient();
  const spreadsheetId = getSheetId();

  const resp = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: sheetNames,
  });

  const out = {};
  (resp.data.valueRanges || []).forEach((vr, i) => {
    out[sheetNames[i]] = rowsToObjects(vr.values || []);
  });

  return {
    fileName: title,
    fetchedAt: new Date().toISOString(),
    sheets: out,
  };
}
