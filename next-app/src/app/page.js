'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'super') {
      setEmail('superadmin@example.com');
      setPassword('admin123');
    } else if (role === 'admin') {
      setEmail('admin@example.com');
      setPassword('admin123');
    } else if (role === 'employee') {
      setEmail('employee@example.com');
      setPassword('user123');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)] bg-[var(--color-bg)]">
      <nav className="px-16 py-6 flex justify-between items-center border-b border-[var(--color-card-border)] bg-[rgba(7,11,20,0.6)] backdrop-blur-md">
        <div className="flex items-center gap-3 text-2xl font-bold text-[var(--color-text-main)]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_15px_var(--color-purple-glow)] flex items-center justify-center text-sm">A</div>
          Attendance Pro
        </div>
        <div className="flex gap-4">
          <button className="btn-outline">Documentation</button>
          <button className="btn-primary">Get Started</button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-between px-16 max-w-[1400px] mx-auto w-full gap-16">
        <div className="flex-1 max-w-[600px]">
          <h1 className="text-6xl font-extrabold leading-[1.1] mb-6 bg-gradient-to-br from-white to-slate-400 text-transparent bg-clip-text">
            Next-Gen Attendance Management
          </h1>
          <p className="text-xl text-[var(--color-text-muted)] mb-10 leading-relaxed">
            Experience a stunning, high-fidelity platform designed to streamline employee tracking, dynamic reporting, and robust role-based access control. Powered by AI and seamless Excel integration.
          </p>
          <div className="flex gap-8 text-[0.95rem] text-[var(--color-text-muted)] font-medium">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-[var(--color-green)] text-xs">✓</div>
              Real-time Sync
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-[var(--color-green)] text-xs">✓</div>
              Advanced Analytics
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-[var(--color-green)] text-xs">✓</div>
              Role Based Views
            </div>
          </div>
        </div>

        <div className="w-[450px] p-10 bg-[rgba(15,23,42,0.7)] border border-[var(--color-card-border)] rounded-2xl backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-white">Sign In</h2>
            <p className="text-[var(--color-text-muted)] text-[0.95rem]">Access your workspace based on your role</p>
          </div>

          <div className="flex p-1 bg-black/40 rounded-xl mb-8 border border-[var(--color-card-border)]">
            <button onClick={() => fillDemo('super')} className="flex-1 py-3 text-center rounded-lg text-xs font-semibold cursor-pointer transition-all bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] shadow-[0_0_10px_var(--color-purple-glow)] border border-[var(--color-purple)]">
              Super Admin
            </button>
            <button onClick={() => fillDemo('admin')} className="flex-1 py-3 text-center rounded-lg text-[var(--color-text-muted)] text-xs font-semibold cursor-pointer transition-all hover:bg-white/5 hover:text-white">
              Supervisor
            </button>
            <button onClick={() => fillDemo('employee')} className="flex-1 py-3 text-center rounded-lg text-[var(--color-text-muted)] text-xs font-semibold cursor-pointer transition-all hover:bg-white/5 hover:text-white">
              Employee
            </button>
          </div>

          <form onSubmit={handleLogin}>
            {error && <div className="mb-4 text-sm text-[var(--color-red)] text-center">{error}</div>}
            
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] transition-all"
              />
            </div>
            
            <div className="mb-8">
              <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] transition-all"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-6 flex justify-center gap-4 text-xs font-medium text-[var(--color-purple)] opacity-80">
            <span className="cursor-pointer hover:underline" onClick={() => fillDemo('super')}>Demo SuperAdmin</span>
            <span className="cursor-pointer hover:underline" onClick={() => fillDemo('admin')}>Demo Admin</span>
            <span className="cursor-pointer hover:underline" onClick={() => fillDemo('employee')}>Demo Employee</span>
          </div>
        </div>
      </div>
    </div>
  );
}
