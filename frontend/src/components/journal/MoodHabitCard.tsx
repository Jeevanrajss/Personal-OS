import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * Shows which habits correlate with higher or lower mood days.
 *
 * For each habit: avg mood valence on days it was done vs not done.
 * Sorted by absolute mood lift, strongest first.
 * Only habits with >=5 completed days are shown (too few = unreliable).
 */
export function MoodHabitCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['journal-mood-habits'],
    queryFn: () => api.journal.moodHabits(90),
    staleTime: 1000 * 60 * 5,
  });

  // Only show habits with enough data and a non-zero lift
  const meaningful = (data?.correlations ?? []).filter(
    (c) => c.days_done >= 5 && c.mood_lift !== null,
  );

  const maxLift = Math.max(0.01, ...meaningful.map((c) => Math.abs(c.mood_lift ?? 0)));

  return (
    <div className="card">
      <div className="card-title">Habits & mood</div>
      <p className="text-[11px] text-ink-600 mb-3 -mt-1">
        How each habit correlates with your mood ({data?.window_days ?? 90}d window)
      </p>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-ink-600">Loading…</div>
      ) : meaningful.length === 0 ? (
        <div className="py-4 text-center text-xs text-ink-600">
          Not enough data yet. Log moods and habits for a few weeks to see correlations.
        </div>
      ) : (
        <div className="space-y-3">
          {meaningful.map((c) => {
            const lift = c.mood_lift ?? 0;
            const positive = lift > 0;
            const barWidth = Math.round((Math.abs(lift) / maxLift) * 100);

            return (
              <div key={c.habit_id}>
                {/* Header row */}
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    to={`/habits/${c.habit_id}`}
                    className="flex items-center gap-1.5 min-w-0 group"
                  >
                    <span className="text-sm shrink-0">{c.habit_emoji}</span>
                    <span className="text-xs text-ink-300 truncate group-hover:text-accent transition-colors">
                      {c.habit_name}
                    </span>
                  </Link>
                  <span className={cn(
                    'ml-auto text-xs font-semibold tabular-nums shrink-0',
                    positive ? 'text-emerald-400' : 'text-rose-400',
                  )}>
                    {lift > 0 ? '+' : ''}{lift.toFixed(2)}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        positive ? 'bg-emerald-500/60' : 'bg-rose-500/50',
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                {/* Sub-labels */}
                <div className="flex items-center justify-between mt-0.5 text-[10px] text-ink-600">
                  <span>{c.days_done} days done</span>
                  <span>
                    {c.avg_mood_with !== null
                      ? `mood: ${c.avg_mood_with > 0 ? '+' : ''}${c.avg_mood_with.toFixed(1)} (done) vs ${c.avg_mood_without !== null ? `${c.avg_mood_without > 0 ? '+' : ''}${c.avg_mood_without.toFixed(1)}` : '—'} (not done)`
                      : ''}
                  </span>
                </div>
              </div>
            );
          })}

          <p className="text-[10px] text-ink-700 pt-1 border-t border-ink-900">
            Correlation ≠ causation. Based on mood logged on same day as check-in.
          </p>
        </div>
      )}
    </div>
  );
}
