import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { api, type FinanceMeta, type Transaction, type TransactionIn } from '@/lib/api';
import { cn } from '@/lib/cn';
import { TransactionForm } from './TransactionForm';

type Props = {
  transactions: Transaction[];
  meta: FinanceMeta;
  queryKey: unknown[];
};

function fmtAmount(t: Transaction): string {
  const sym = t.currency === 'INR' ? '₹' : t.currency === 'USD' ? '$' : t.currency === 'EUR' ? '€' : `${t.currency} `;
  return `${sym}${t.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function groupByDate(txns: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const existing = map.get(t.date) ?? [];
    existing.push(t);
    map.set(t.date, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({ date, items }));
}

export function TransactionList({ transactions, meta, queryKey }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.finance.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TransactionIn> }) =>
      api.finance.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      setEditing(null);
    },
  });

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-ink-600">
        No transactions this month. Add your first one above.
      </div>
    );
  }

  const groups = groupByDate(transactions);

  return (
    <div className="space-y-4">
      {groups.map(({ date, items }) => (
        <div key={date}>
          <div className="text-[11px] text-ink-600 uppercase tracking-wide mb-1.5 px-1">
            {fmtDate(date)}
          </div>
          <div className="space-y-1">
            {items.map((t) => (
              <div key={t.id}>
                {editing === t.id ? (
                  <div className="card p-4">
                    <TransactionForm
                      meta={meta}
                      initial={t}
                      onSubmit={async (patch) => { await updateMut.mutateAsync({ id: t.id, patch }); }}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-ink-900/60 group transition-colors">
                    {/* Category emoji */}
                    <span className="text-base w-6 text-center shrink-0">
                      {meta.category_emoji[t.category ?? ''] ?? (t.type === 'income' ? '💵' : '💸')}
                    </span>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-100 truncate">
                        {t.payee || t.category || (t.type === 'income' ? 'Income' : t.type === 'transfer' ? 'Transfer' : 'Expense')}
                      </div>
                      <div className="text-[11px] text-ink-600 truncate">
                        {[t.category, t.account].filter(Boolean).join(' · ')}
                      </div>
                    </div>

                    {/* Amount */}
                    <span className={cn(
                      'text-sm font-semibold tabular-nums shrink-0',
                      t.type === 'income' ? 'text-emerald-400' : t.type === 'transfer' ? 'text-accent' : 'text-red-400',
                    )}>
                      {t.type === 'income' ? '+' : t.type === 'transfer' ? '↔' : '−'}{fmtAmount(t)}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditing(t.id)}
                        className="p-1 rounded text-ink-600 hover:text-ink-300 hover:bg-ink-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm('Delete this transaction?')) deleteMut.mutate(t.id); }}
                        className="p-1 rounded text-ink-600 hover:text-red-400 hover:bg-ink-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
