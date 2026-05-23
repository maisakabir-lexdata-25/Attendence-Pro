'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: '—', present: '—', late: '—', absent: '—' });

  useEffect(() => {
    // In a real implementation, you would connect to the websocket here 
    // or fetch data from your API to populate these stats dynamically
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/localfile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.sheets) {
          const sheetNames = Object.keys(data.sheets);
          const firstSheet = sheetNames.find(n => n.toLowerCase() !== 'leave list');
          if (firstSheet && data.sheets[firstSheet]) {
             setStats({
               total: data.sheets[firstSheet].rows.length,
               present: Math.floor(data.sheets[firstSheet].rows.length * 0.85), // Mock derived data
               late: Math.floor(data.sheets[firstSheet].rows.length * 0.10),
               absent: Math.floor(data.sheets[firstSheet].rows.length * 0.05),
             });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch local stats', err);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center text-[var(--color-purple)]">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Total Employees</p>
            <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-[var(--color-green)]">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Present Today</p>
            <h3 className="text-2xl font-bold text-white">{stats.present}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(234,179,8,0.15)] flex items-center justify-center text-[var(--color-yellow)]">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Late Today</p>
            <h3 className="text-2xl font-bold text-white">{stats.late}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(239,68,68,0.15)] flex items-center justify-center text-[var(--color-red)]">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Absent Today</p>
            <h3 className="text-2xl font-bold text-white">{stats.absent}</h3>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-2 gap-8">
        <div className="card min-h-[400px]">
          <h3 className="font-semibold text-lg mb-4">Attendance Overview</h3>
          <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)] opacity-50">
            <p>Chart data will be rendered here...</p>
          </div>
        </div>
        <div className="card min-h-[400px]">
          <h3 className="font-semibold text-lg mb-4">Recent Attendance</h3>
          <div className="w-full text-left text-sm text-[var(--color-text-muted)] flex items-center justify-center h-[300px] opacity-50">
            <p>Upload sheet data to view recent records.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
