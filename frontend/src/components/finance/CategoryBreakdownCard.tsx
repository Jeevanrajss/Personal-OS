import { type BudgetProgress, type CategoryStat, type FinanceMeta } from '@/lib/api';
import { cn } from '@/lib/cn';

const BAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
];

type Props = {
  stats: CategoryStat[];
  meta: FinanceMeta;
  currency: string;
  budgetByCategory?: BudgetProgress[];
};

function fmt(n: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}

export function CategoryBreakdownCard({ stats, meta, currency, budgetByCategory = [] }: Props) {
  if (stats.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Spending by Category</div>
        <p className="text-xs text-ink-600 text-center py-6">No expenses this month.</p>
      </div>
    );
  }

  const budgetMap = Object.fromEntries(budgetByCategory.map((b) => [b.category, b]));
  const max = Math.max(...stats.map((s) => s.total), 1);
  const top = stats.slice(0, 7);

  return (
    <div className="card">
      <div className="card-title">Spending by Category</div>
      <div className="space-y-3.5">
        {top.map((s, i) => {
          const pct = (s.total / max) * 100;
          const bp = budgetMap[s.category];
          const over = bp ? s.total > bp.budget : false;

          return (
            <div key={s.category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{meta.category_emoji[s.category] ?? '📌'}</span>
                  <span className="text-xs text-ink-300 truncate">{s.category}</span>
                  <span className="text-[10px] text-ink-600 shrink-0">×{s.count}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={cn('text-xs font-medium tabular-nums', over ? 'text-red-400' : 'text-ink-200')}>
                    {fmt(s.total, currency)}
                  </span>
                  {bp && (
                    <span className={cn(
                      'text-[10px] tabular-nums px-1.5 py-0.5 rounded',
                      over
                        ? 'bg-red-500/15 text-red-400'
                        : bp.pct > 80
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-ink-900 text-ink-600',
                    )}>
                      {over ? '⚠ ' : ''}{bp.pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Spending bar */}
              <div className="relative h-1.5 bg-ink-900 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    over
                      ? 'bg-red-500'
                      : BAR_COLORS[i % BAR_COLORS.length],
                  )}
                  style={{ width: `${pct}%` }}
                />
                {/* Budget marker line */}
                {bp && bp.budget > 0 && (
                  <div
                    className="absolute top-0 h-full w-px bg-white/30"
                    style={{ left: `${Math.min((bp.budget / max) * 100, 100)}%` }}
                  />
                )}
              </div>

              {/* Budget label */}
              {bp && (
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px] text-ink-700">
                    of {fmt(bp.budget, currency)} budget
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
