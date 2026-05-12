import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { api, type Habit } from '@/lib/api';
import { addDays, isSameDay, toISODate } from '@/lib/date';
import { cn } from '@/lib/cn';

type Props = {
  habits: Habit[];
  weekStart: Date; // Monday (local)
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Visual-only bar chart for the selected week.
 *
 * Top section  — 7 vertical bars (Mon→Sun) showing % of habits done that day.
 * Bottom section — one row per habit: emoji, name, 7 coloured cells, week %.
 *
 * Re-uses the same query keys as HabitWeekTable so data is already cached.
 */
export function HabitWeekChart({ habits, weekStart }: Props) {
  const days = useMemo<Date[]>(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const fromISO = toISODate(days[0]);
  const toISO = toISODate(days[6]);
  const today = new Date();

  const queries = useQueries({
    queries: habits.map((h) => ({
      queryKey: ['habit-checkins', h.id, fromISO, toISO],
      queryFn: () => api.habits.listCheckins(h.id, fromISO, toISO),
      staleTime: 1000 * 10,
    })),
  });

  // habit_id → Set<dateISO>
  const doneByHabit = useMemo<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    habits.forEach((h, i) => {
      const data = queries[i]?.data ?? [];
      out[h.id] = new Set(data.map((c) => c.day_date));
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, queries.map((q) => q.dataUpdatedAt).join('|')]);

  if (habits.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-800 px-5 py-10 text-center text-sm text-ink-500">
        No habits yet. Add one above to start tracking.
      </div>
    );
  }

  // --- Derived data ---------------------------------------------------------

  // Per-day: how many habits were done (scheduled habits only where relevant)
  const dayStats = days.map((d) => {
    const iso = toISODate(d);
    const scheduledHabits = habits.filter((h) => {
      if (h.frequency_kind === 'daily') return true;
      const isoWeekday = (d.getDay() + 6) % 7; // 0=Mon
      return h.weekdays.includes(isoWeekday);
    });
    const done = scheduledHabits.filter((h) => doneByHabit[h.id]?.has(iso)).length;
    const total = scheduledHabits.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { date: d, iso, done, total, pct, isToday: isSameDay(d, today) };
  });

  const maxPct = Math.max(1, ...dayStats.map((d) => d.pct));

  // Per-habit: how many of their scheduled days in this week were done
  const habitStats = habits.map((h) => {
    const scheduledDays = days.filter((d) => {
      if (h.frequency_kind === 'daily') return true;
      const isoWeekday = (d.getDay() + 6) % 7;
      return h.weekdays.includes(isoWeekday);
    });
    const doneDays = scheduledDays.filter((d) => doneByHabit[h.id]?.has(toISODate(d)));
    const pct = scheduledDays.length === 0
      ? 0
      : Math.round((doneDays.length / scheduledDays.length) * 100);
    return { habit: h, pct, done: doneDays.length, total: scheduledDays.length };
  });

  // Overall week score
  const totalDone = dayStats.reduce((s, d) => s + d.done, 0);
  const totalPossible = dayStats.reduce((s, d) => s + d.total, 0);
  const overallPct = totalPossible === 0 ? 0 : Math.round((totalDone / totalPossible) * 100);

  return (
    <div className="space-y-6">
      {/* ── Overall score ── */}
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold text-ink-50 tabular-nums">{overallPct}%</div>
        <div className="text-sm text-ink-500">
          overall this week
          <span className="ml-1 text-ink-600">({totalDone}/{totalPossible} scheduled)</span>
        </div>
        <div className="ml-auto">
          <WeekScoreBadge pct={overallPct} />
        </div>
      </div>

      {/* ── Daily bars ── */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-3">Daily completion</div>
        <div className="flex items-end gap-2 h-28">
          {dayStats.map(({ date, iso, pct, done, total, isToday }) => {
            const barH = total === 0 ? 0 : Math.max(4, (pct / maxPct) * 100);
            return (
              <div key={iso} className="flex-1 flex flex-col items-center gap-1">
                {/* pct label */}
                <span className={cn(
                  'text-[10px] tabular-nums',
                  pct === 100 ? 'text-emerald-400' : pct >= 50 ? 'text-accent' : 'text-ink-500',
                )}>
                  {total === 0 ? '' : `${pct}%`}
                </span>
                {/* bar */}
                <div className="w-full flex items-end justify-center h-20">
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all duration-300',
                      total === 0
                        ? 'bg-ink-900 border border-dashed border-ink-800'
                        : pct === 100
                          ? 'bg-emerald-500/60 hover:bg-emerald-500/80'
                          : pct >= 50
                            ? 'bg-accent/60 hover:bg-accent/80'
                            : 'bg-ink-700 hover:bg-ink-600',
                    )}
                    style={{ height: total === 0 ? '4px' : `${barH}%` }}
                    title={total === 0 ? 'No habits scheduled' : `${done}/${total} habits`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {/* Day labels */}
        <div className="flex gap-2 mt-1">
          {dayStats.map(({ date, iso, isToday }) => (
            <div key={iso} className="flex-1 text-center">
              <span className={cn(
                'text-[10px]',
                isToday ? 'text-accent font-semibold' : 'text-ink-600',
              )}>
                {DAY_LABELS[(date.getDay() + 6) % 7]}
              </span>
              {isToday && (
                <span className="block w-1 h-1 rounded-full bg-accent mx-auto mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-habit rows ── */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-3">Per habit</div>
        <div className="space-y-2">
          {habitStats.map(({ habit, pct, done, total }) => (
            <div key={habit.id} className="flex items-center gap-3">
              {/* Habit name */}
              <Link
                to={`/habits/${habit.id}`}
                className="flex items-center gap-1.5 w-36 shrink-0 min-w-0 group"
              >
                <span className="text-sm shrink-0">{habit.emoji}</span>
                <span className="text-xs text-ink-400 truncate group-hover:text-ink-200 transition-colors">
                  {habit.name}
                </span>
              </Link>

              {/* 7-day cells */}
              <div className="flex gap-1 shrink-0">
                {days.map((d) => {
                  const iso = toISODate(d);
                  const isoWeekday = (d.getDay() + 6) % 7;
                  const offSchedule =
                    habit.frequency_kind === 'weekly' && !habit.weekdays.includes(isoWeekday);
                  const done = doneByHabit[habit.id]?.has(iso);
                  const isToday = isSameDay(d, today);
                  return (
                    <div
                      key={iso}
                      title={`${DAY_LABELS[(d.getDay() + 6) % 7]}: ${done ? 'done' : offSchedule ? 'not scheduled' : 'missed'}`}
                      className={cn(
                        'w-5 h-5 rounded-sm border',
                        done
                          ? 'bg-accent/30 border-accent/60'
                          : offSchedule
                            ? 'bg-transparent border-dashed border-ink-800 opacity-30'
                            : isToday
                              ? 'bg-ink-900 border-ink-600'
                              : 'bg-ink-900 border-ink-800',
                      )}
                    />
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      pct === 100 ? 'bg-emerald-500/70' : 'bg-accent/60',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={cn(
                  'text-xs tabular-nums w-9 text-right shrink-0',
                  pct === 100 ? 'text-emerald-400' : total === 0 ? 'text-ink-600' : 'text-ink-400',
                )}>
                  {total === 0 ? '—' : `${pct}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score badge — colour reflects performance tier
// ---------------------------------------------------------------------------
function WeekScoreBadge({ pct }: { pct: number }) {
  const { label, cls } = pct === 100
    ? { label: '🏆 Perfect week', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' }
    : pct >= 80
      ? { label: '🔥 Strong week', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' }
      : pct >= 50
        ? { label: '📈 Keep going', cls: 'bg-accent/10 border-accent/30 text-accent' }
        : pct > 0
          ? { label: '💪 Keep pushing', cls: 'bg-ink-900 border-ink-700 text-ink-400' }
          : { label: '🌱 Start today', cls: 'bg-ink-900 border-ink-700 text-ink-500' };

  return (
    <span className={cn('px-2.5 py-1 rounded-full border text-xs font-medium', cls)}>
      {label}
    </span>
  );
}
