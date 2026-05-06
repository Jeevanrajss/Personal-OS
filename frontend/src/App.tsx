import { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Landing } from '@/routes/Landing';
import { Dashboard } from '@/routes/Dashboard';
import { Journal } from '@/routes/Journal';
import { Finance } from '@/routes/Finance';
import { Subscriptions } from '@/routes/Subscriptions';
import { Habits } from '@/routes/Habits';
import { HabitDetail } from '@/routes/HabitDetail';
import { Settings } from '@/routes/Settings';

function AppShell() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  function toggleSidebar() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar_collapsed', String(!prev));
      return !prev;
    });
  }

  return (
    <div className="flex h-full">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/habits/:id" element={<HabitDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const location = useLocation();

  // Landing page at root
  if (location.pathname === '/') {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    );
  }

  // App shell wraps /app/* routes
  if (location.pathname.startsWith('/app')) {
    return (
      <Routes>
        <Route path="/app/*" element={<AppShell />} />
      </Routes>
    );
  }

  // Legacy direct routes (e.g. /journal, /habits) — redirect into /app/*
  return (
    <Routes>
      <Route path="/journal" element={<Navigate to="/app/journal" replace />} />
      <Route path="/finance" element={<Navigate to="/app/finance" replace />} />
      <Route path="/subscriptions" element={<Navigate to="/app/subscriptions" replace />} />
      <Route path="/habits" element={<Navigate to="/app/habits" replace />} />
      <Route path="/habits/:id" element={<Navigate to={`/app${location.pathname}`} replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
