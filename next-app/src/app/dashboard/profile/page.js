'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSheets } from '@/lib/SheetsContext';
import { computeEmployeeStats } from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { activeSheetData, loading } = useSheets();

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      if (!stored) { router.push('/'); return; }
      setUser(stored);
    } catch {
      router.push('/');
    }
  }, [router]);

  if (!user) return null;

  const employees = activeSheetData
    ? computeEmployeeStats(activeSheetData.rows, activeSheetData.headers)
    : [];
  const match = employees.find(e => e.name.toLowerCase() === user.name.toLowerCase());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Profile" subtitle="Your account and attendance summary" />

      <div className="card flex items-center gap-5 flex-wrap">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] flex items-center justify-center font-bold text-white text-xl">
          {user.avatar}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{user.name}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
          <p className="text-xs text-[var(--color-purple)] mt-1 uppercase tracking-wide">{user.role}</p>
        </div>
      </div>

      {loading && !match && <div className="card text-[var(--color-text-muted)] text-sm">Loading attendance…</div>}

      {match && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Present</p><p className="text-2xl font-bold text-[var(--color-green)] mt-1">{match.present}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Late</p><p className="text-2xl font-bold text-[var(--color-yellow)] mt-1">{match.late}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Absent</p><p className="text-2xl font-bold text-[var(--color-red)] mt-1">{match.absent}</p></div>
            <div className="card text-center"><p className="text-xs text-[var(--color-text-muted)]">Rate</p><p className="text-2xl font-bold text-white mt-1">{match.rate}%</p></div>
          </div>
          <Link href={`/dashboard/employees?id=${encodeURIComponent(match.id)}`} className="btn-primary py-2 px-4 text-sm self-start">
            View detailed profile
          </Link>
        </>
      )}

      {!loading && !match && activeSheetData && (
        <div className="card text-sm text-[var(--color-text-muted)]">
          We couldn't find your name in the active attendance sheet. Ask your admin to add you.
        </div>
      )}
    </div>
  );
}
