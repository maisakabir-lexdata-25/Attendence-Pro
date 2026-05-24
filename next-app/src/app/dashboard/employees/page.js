'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useSheets } from '@/lib/SheetsContext';
import {
  computeEmployeeStats,
  getDateColumns,
  getEmployeeIdColumn,
  normalizeStatus,
} from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import SheetPicker from '@/components/SheetPicker';
import StatusBadge from '@/components/StatusBadge';
import EmployeeAvatar from '@/components/EmployeeAvatar';

const STATUS_FILTERS = [
  { key: '',    label: 'All' },
  { key: 'L',   label: 'Late' },
  { key: 'A',   label: 'Absent' },
  { key: 'WFH', label: 'WFH' },
];

const STATUS_COLORS = {
  P:   { fg: 'var(--color-green)',  label: 'Present' },
  L:   { fg: 'var(--color-yellow)', label: 'Late' },
  A:   { fg: 'var(--color-red)',    label: 'Absent' },
  WFH: { fg: 'var(--color-blue)',   label: 'Work From Home' },
};

function CheckIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function ClockIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function XIcon()       { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>; }
function HomeIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></svg>; }
function SearchIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function FilterIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>; }

function StatCard({ icon, label, value, color }) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3 border"
      style={{ background: `${color}14`, borderColor: `${color}33` }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none" style={{ color }}>{value}</div>
        <div className="text-xs text-[var(--color-text-muted)] mt-1">{label}</div>
      </div>
    </div>
  );
}

function EmployeeListItem({ employee, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
        selected
          ? 'bg-gradient-to-r from-[rgba(139,92,246,0.18)] to-[rgba(59,130,246,0.12)] border border-[var(--color-purple)] shadow-[0_0_0_3px_rgba(139,92,246,0.08)]'
          : 'border border-transparent hover:bg-white/[0.03]'
      }`}
    >
      <EmployeeAvatar id={employee.id} name={employee.name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{employee.name}</div>
        <div className="text-[11px] text-[var(--color-text-muted)]">ID: {employee.id}</div>
      </div>
    </button>
  );
}

function EmployeesPageInner() {
  const { activeSheet, activeSheetData, loading, error } = useSheets();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const employees = useMemo(() => {
    if (!activeSheetData) return [];
    return computeEmployeeStats(activeSheetData.rows, activeSheetData.headers);
  }, [activeSheetData]);

  const filtered = useMemo(() => {
    let list = employees;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
    }
    if (statusFilter === 'L') list = list.filter(e => e.late > 0);
    else if (statusFilter === 'A') list = list.filter(e => e.absent > 0);
    else if (statusFilter === 'WFH') list = list.filter(e => e.wfh > 0);
    return list;
  }, [employees, searchTerm, statusFilter]);

  const urlId = search.get('id') || '';
  const selectedId = urlId || filtered[0]?.id || employees[0]?.id || '';
  const selected = employees.find(e => e.id === selectedId) || null;

  useEffect(() => {
    if (!urlId && filtered[0]?.id) {
      const params = new URLSearchParams(search.toString());
      params.set('id', filtered[0].id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [urlId, filtered, pathname, router, search]);

  const setSelected = (id) => {
    const params = new URLSearchParams(search.toString());
    params.set('id', id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const history = useMemo(() => {
    if (!activeSheetData || !selected) return [];
    const idCol = getEmployeeIdColumn(activeSheetData.headers);
    const row = activeSheetData.rows.find(r => String(r[idCol] ?? '').trim() === selected.id);
    if (!row) return [];
    return getDateColumns(activeSheetData.headers)
      .map(col => ({ date: col, status: normalizeStatus(row[col]) }))
      .filter(e => e.status);
  }, [activeSheetData, selected]);

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <PageHeader
        title="Employee Profile & Details"
        actions={
          <div className="flex items-center gap-3 relative">
            <SheetPicker />
            <button
              onClick={() => setShowFilter(s => !s)}
              className={`btn-outline py-1.5 px-3 text-sm flex items-center gap-2 ${statusFilter ? 'border-[var(--color-purple)] text-[var(--color-purple)]' : ''}`}
            >
              <FilterIcon /> Filter{statusFilter ? `: ${statusFilter}` : ''}
            </button>
            {showFilter && (
              <div className="absolute top-full mt-2 right-0 z-20 bg-[rgba(15,23,42,0.95)] border border-[var(--color-card-border)] rounded-lg shadow-xl backdrop-blur-xl p-2 min-w-[160px]">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setStatusFilter(f.key); setShowFilter(false); }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      statusFilter === f.key
                        ? 'bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)]'
                        : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {error && <div className="card text-[var(--color-red)] text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 flex-1 min-h-0">
        {/* Left: List */}
        <div className="card flex flex-col p-0 overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-[var(--color-card-border)]">
            <h3 className="font-semibold text-white">Employees</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]/40">
              {filtered.length}
            </span>
          </div>
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
            {loading && !employees.length && (
              <div className="text-center text-[var(--color-text-muted)] text-sm py-8">Loading…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center text-[var(--color-text-muted)] text-sm py-8">No employees match.</div>
            )}
            {filtered.map(emp => (
              <EmployeeListItem
                key={emp.id}
                employee={emp}
                selected={emp.id === selectedId}
                onClick={() => setSelected(emp.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="overflow-y-auto pr-1 -mr-1 flex flex-col gap-6">
          {!selected && !loading && (
            <div className="card text-center text-[var(--color-text-muted)] py-16">
              Select an employee from the list to see their profile.
            </div>
          )}

          {selected && (
            <>
              {/* Header */}
              <div className="card flex items-center gap-5 flex-wrap">
                <EmployeeAvatar id={selected.id} name={selected.name} size={84} />
                <div className="flex-1 min-w-[200px]">
                  <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Employee ID: {selected.id}</p>
                  {activeSheet && (
                    <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 text-xs rounded-md bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] border border-[var(--color-purple)]/40">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {activeSheet}
                    </span>
                  )}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<CheckIcon />} label="Total Present" value={selected.present} color="#22C55E" />
                <StatCard icon={<ClockIcon />} label="Total Late"    value={selected.late}    color="#EAB308" />
                <StatCard icon={<XIcon />}     label="Total Absent"  value={selected.absent}  color="#EF4444" />
                <StatCard icon={<HomeIcon />}  label="WFH Days"      value={selected.wfh}     color="#8B5CF6" />
              </div>

              {/* Attendance Rate */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">Attendance Rate</h3>
                  <span className="text-sm font-semibold text-white">{selected.rate}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)] transition-all duration-500"
                    style={{ width: `${selected.rate}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-3">
                  {selected.marked} working {selected.marked === 1 ? 'day' : 'days'} recorded this month
                </p>
              </div>

              {/* History */}
              <div className="card p-0 overflow-hidden">
                <div className="p-5 border-b border-[var(--color-card-border)]">
                  <h3 className="font-semibold text-white">Attendance History</h3>
                </div>
                {history.length === 0 ? (
                  <div className="px-5 py-12 text-center text-[var(--color-text-muted)] text-sm">
                    No records found
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] text-xs border-b border-[var(--color-card-border)]">
                        <th className="py-3 px-5 font-medium">Date</th>
                        <th className="py-3 px-5 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry, i) => {
                        const c = STATUS_COLORS[entry.status] || { fg: 'var(--color-text-muted)', label: entry.status };
                        return (
                          <tr key={i} className="border-t border-[var(--color-card-border)] hover:bg-white/[0.02]">
                            <td className="py-3 px-5 text-white">{entry.date}</td>
                            <td className="py-3 px-5 text-right">
                              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: `${c.fg}1A`, color: c.fg }}>
                                <StatusBadge value={entry.status} />
                                {c.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div className="card text-[var(--color-text-muted)]">Loading…</div>}>
      <EmployeesPageInner />
    </Suspense>
  );
}
