import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * 12-month billing forecast bar chart.
 *
 * Bar height = total billed in that month.
 * The current month is highlighted. Months with annual/quarterly renewals
 * stand out as taller spikes.
 *
 * No currency conversion — amounts stay in their original currency and are
 * summed. If all subs share one currency this is exact; if mixed it's a
 * rough stacked view (labelled accordingly).
 */
export function SubForecastCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['sub-forecast'],
    queryFn: api.subscriptions.forecast,
    staleTime: 1000 * 60 * 5,
  });

  const months = data?.months ?? [];
  const maxTotal = Math.max(1, ...months.map((m) => m.total));

  // Detect mixed currencies
  const currencies = [...new Set(months.filter((m) => m.bill_count > 0).map((m) => m.currency))];
  const mixedCurrencies = currencies.length > 1;

  // Current year-month
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (months.length === 0 || months.every((m) => m.bill_count === 0)) {
    return null;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <div className="card-title mb-0">12-month billing forecast</div>
        {mixedCurrencies && (
          <span className="text-[10px] text-ink-600">mixed currencies</span>
        )}
      </div>
      <p className="text-[11px] text-ink-600 mb-4">
        Upcoming bills month by month — spikes = annual/quarterly renewals
      </p>

      {isLoading ? (
        <div className="h-24 flex items-center justify-center text-xs text-ink-600">Loading…</div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="flex items-end gap-1 h-24">
            {months.map((m) => {
              const isCurrent = m.year_month === currentYM;
              const barH = m.bill_count === 0
                ? 3
                : Math.max(6, (m.total / maxTotal) * 100);

              return (
                <div
                  key={m.year_month}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  {m.bill_count > 0 && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10
                      hidden group-hover:block w-36 bg-ink-800 border border-ink-700
                      rounded-lg shadow-xl p-2 text-[11px] text-ink-300 pointer-events-none whitespace-nowrap">
                      <div className="font-semibold text-ink-100 mb-0.5">{formatYM(m.year_month)}</div>
                      <div>
                        {m.currency} {m.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-ink-500">{m.bill_count} bill{m.bill_count !== 1 ? 's' : ''}</div>
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={cn(
                      'w-full rounded-t-sm transition-colors',
                      m.bill_count === 0
                        ? 'bg-ink-900 border-t border-dashed border-ink-800'
                        : isCurrent
                          ? 'bg-accent/80 hover:bg-accent'
                          : 'bg-accent/40 hover:bg-accent/60',
                    )}
                    style={{ height: `${barH}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Month labels */}
          <div className="flex gap-1 mt-1.5">
            {months.map((m) => {
              const isCurrent = m.year_month === currentYM;
              return (
                <div key={m.year_month} className="flex-1 flex flex-col items-center">
                  <span className={cn(
                    'text-[9px] truncate',
                    isCurrent ? 'text-accent font-semibold' : 'text-ink-600',
                  )}>
                    {m.year_month.slice(5)}
                  </span>
                  {isCurrent && (
                    <span className="w-1 h-1 rounded-full bg-accent mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Peak month callout */}
          {(() => {
            const peak = months.reduce((best, m) => m.total > best.total ? m : best, months[0]);
            if (peak.total <= 0) return null;
            return (
              <div className="mt-3 pt-3 border-t border-ink-900 text-[11px] text-ink-500">
                Highest spend:{' '}
                <span className="text-ink-300 font-medium">{formatYM(peak.year_month)}</span>
                {' — '}
                <span className="text-ink-300">{peak.currency} {peak.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                {' '}
                <span className="text-ink-600">({peak.bill_count} bills)</span>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}
