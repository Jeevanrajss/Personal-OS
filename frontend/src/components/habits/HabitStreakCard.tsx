import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function HabitStreakCard() {
  const { data } = useQuery({
    queryKey: ['habits-stats', 30],
    queryFn: () => api.habits.stats(30),
    staleTime: 1000 * 30,
  });

  const last7   = data?.daily_any_done ?? [];
  const current = data?.overall_current_streak ?? 0;
  const longest = data?.overall_longest_streak_in_window ?? 0;

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header */}
      <h3 style={{ margin: '0 0 14px', font: '500 12px/1 var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Streak
        <span style={{ color: 'var(--fg-3)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'none', fontWeight: 400 }}>7 days</span>
      </h3>

      {/* KPI */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ font: '500 12px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 4 }}>
          Current streak
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ font: '500 36px/1 var(--font-display)', letterSpacing: '-0.02em', color: current > 0 ? 'var(--accent-orange)' : 'var(--fg-1)' }}>
            {current > 0 ? `🔥 ${current}` : current}
          </span>
          <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>day{current !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* 7-day bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 10 }}>
        {(last7.length > 0 ? last7 : Array(7).fill({ any_done: false, done_count: 0, date: '' })).map((p, i) => (
          <div
            key={p.date || i}
            style={{
              height: 28, borderRadius: 4,
              background: p.any_done
                ? 'linear-gradient(180deg, var(--accent-orange), rgba(255,184,107,0.4))'
                : 'var(--surface-hover)',
              boxShadow: p.any_done ? '0 0 10px rgba(255,184,107,0.30)' : 'none',
            }}
            title={p.date ? `${p.date}: ${p.done_count} habit${p.done_count === 1 ? '' : 's'} done` : ''}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-4)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
        <span>7 DAYS AGO</span>
        <span>TODAY</span>
      </div>

      {/* Footer stat */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 14 }}>
        <div style={{ font: '500 12px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 4 }}>
          Longest (30d)
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ font: '500 22px/1 var(--font-display)', letterSpacing: '-0.01em', color: 'var(--fg-1)' }}>{longest}</span>
          <span style={{ color: 'var(--fg-3)', fontSize: 11 }}>days</span>
        </div>
      </div>
    </div>
  );
}
