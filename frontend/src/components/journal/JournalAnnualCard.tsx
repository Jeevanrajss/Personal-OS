import { useQuery } from '@tanstack/react-query';
import { api, type MonthlyAnnualPoint } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * 12-month journal review card.
 *
 * Shows a vertical bar chart (one bar per month) where bar height represents
 * number of active days (days with entries), and bar colour represents average
 * mood valence for that month:
 *   green  → positive mood (valence > 0.3)
 *   amber  → neutral
 *   rose   → negative mood (valence < -0.3)
 *   grey   → no mood logged
 *
 * Hovering a bar reveals: active days, total entries, avg mood, top tags.
 */
export function JournalAnnualCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['journal-annual'],
    queryFn: api.journal.annual,
    staleTime: 1000 * 60 * 5,
  });

  const months = data?.months ?? [];

  // total stats for the summary row
  const totalEntries = months.reduce((s, m) => s + m.total_entries, 0);
  const activeDays = months.reduce((s, m) => s + m.active_days, 0);
  const moodMonths = months.filter((m) => m.valence_avg !== null);
  const overallMood =
    moodMonths.length > 0
      ? moodMonths.reduce((s, m) => s + (m.valence_avg ?? 0), 0) / moodMonths.length
      : null;

  const maxActive = Math.max(1, ...months.map((m) => m.active_days));

  return (
    <div className="card">
      <div className="card-title">Year in review</div>

      {isLoading ? (
        <div className="h-24 flex items-center justify-center text-xs text-ink-400">
          Loading…
        </div>
      ) : totalEntries === 0 ? (
        <div className="h-16 flex items-center justify-center text-xs text-ink-400">
          No journal entries yet.
        </div>
      ) : (
        <>
          {/* Summary chips */}
          <div className="flex gap-4 mb-4 text-[11px]">
            <span className="text-ink-500">
              <span className="font-semibold text-ink-200">{totalEntries}</span> entries
            </span>
            <span className="text-ink-500">
              <span className="font-semibold text-ink-200">{activeDays}</span> days
            </span>
            {overallMood !== null && (
              <span className="text-ink-500">
                avg mood{' '}
                <span className={cn(
                  'font-semibold',
                  overallMood > 0.3 ? 'text-emerald-400' : overallMood < -0.3 ? 'text-rose-400' : 'text-ink-300',
                )}>
                  {overallMood > 0.5 ? '😊' : overallMood > 0 ? '🙂' : overallMood > -0.5 ? '😐' : '😔'}
                </span>
              </span>
            )}
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-20">
            {months.map((m) => {
              const barH = m.active_days === 0
                ? 3
                : Math.max(6, (m.active_days / maxActive) * 100);
              const barColor = getBarColor(m);

              return (
                <div
                  key={m.year_month}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10
                    hidden group-hover:block w-44 bg-ink-800 border border-ink-700
                    rounded-lg shadow-xl p-2 text-[11px] text-ink-300 pointer-events-none">
                    <div className="font-semibold text-ink-100 mb-1">{formatYM(m.year_month)}</div>
                    <div>{m.active_days} days · {m.total_entries} entries</div>
                    {m.valence_avg !== null && (
                      <div>
                        Avg mood:{' '}
                        <span className={cn(
                          m.valence_avg > 0.3 ? 'text-emerald-400' : m.valence_avg < -0.3 ? 'text-rose-400' : 'text-ink-300',
                        )}>
                          {m.valence_avg > 0 ? '+' : ''}{m.valence_avg.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {m.top_tags.length > 0 && (
                      <div className="text-ink-500 mt-0.5 truncate">
                        #{m.top_tags.join(' #')}
                      </div>
                    )}
                  </div>

                  {/* Bar */}
                  <div
                    className={cn('w-full rounded-t-sm transition-colors', barColor)}
                    style={{ height: `${barH}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Month labels */}
          <div className="flex gap-1 mt-1.5">
            {months.map((m) => (
              <div key={m.year_month} className="flex-1 text-center text-[9px] text-ink-400 truncate">
                {m.year_month.slice(5)}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-ink-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-500/50 inline-block" />
              Positive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-ink-600 inline-block" />
              Neutral
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-rose-500/50 inline-block" />
              Low mood
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm border border-dashed border-ink-700 inline-block" />
              No entries
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBarColor(m: MonthlyAnnualPoint): string {
  if (m.active_days === 0) return 'bg-ink-900 border border-dashed border-ink-800';
  if (m.valence_avg === null) return 'bg-ink-700 hover:bg-ink-600';
  if (m.valence_avg > 0.3) return 'bg-emerald-500/50 hover:bg-emerald-500/70';
  if (m.valence_avg < -0.3) return 'bg-rose-500/40 hover:bg-rose-500/60';
  return 'bg-amber-500/40 hover:bg-amber-500/60';
}

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}
