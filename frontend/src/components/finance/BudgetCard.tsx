import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Trash2 } from 'lucide-react';
import { api, type BudgetOut, type FinanceMeta, type MonthlySummary } from '@/lib/api';
import { cn } from '@/lib/cn';

type Props = {
  year: number;
  month: number;
  summary: MonthlySummary | undefined;
  meta: FinanceMeta | undefined;
  currency: string;
};

function fmt(n: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}

function ProgressBar({ pct, over }: { pct: number; over: boolean }) {
  return (
    <div className="h-1.5 bg-ink-900 rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500',
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function BudgetRow({
  label,
  spent,
  budgetEntry,
  currency,
  year,
  month,
  category,
  onSave,
  onDelete,
}: {
  label: string;
  spent: number;
  budgetEntry: BudgetOut | undefined;
  currency: string;
  year: number;
  month: number;
  category: string | null;
  onSave: (amount: number) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budgetEntry ? String(budgetEntry.amount) : '');

  const budget = budgetEntry?.amount ?? 0;
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const over = budget > 0 && spent > budget;

  function save() {
    const n = parseFloat(value);
    if (n > 0) { onSave(n); setEditing(false); }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-200 truncate flex-1">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-500">₹</span>
              <input
                autoFocus
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                className="w-24 bg-ink-900 border border-accent/40 rounded px-2 py-0.5 text-xs outline-none [appearance:textfield]"
              />
              <button
                type="button"
                onClick={save}
                className="p-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {budgetEntry ? (
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs tabular-nums', over ? 'text-red-400' : 'text-ink-400')}>
                    {fmt(spent, currency)} / {fmt(budget, currency)}
                  </span>
                  <span className={cn('text-[10px] tabular-nums', over ? 'text-red-400' : 'text-ink-600')}>
                    {over ? '⚠️ ' : ''}{pct.toFixed(0)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => { setValue(String(budgetEntry.amount)); setEditing(true); }}
                    className="text-[10px] text-ink-600 hover:text-accent transition-colors px-1"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="p-0.5 text-ink-700 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-600">{fmt(spent, currency)} spent</span>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-[10px] text-accent hover:text-accent/70 transition-colors border border-accent/30 rounded px-1.5 py-0.5"
                  >
                    Set budget
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {budgetEntry && <ProgressBar pct={pct} over={over} />}
    </div>
  );
}

export function BudgetCard({ year, month, summary, meta, currency }: Props) {
  const qc = useQueryClient();

  const budgetsQ = useQuery<BudgetOut[]>({
    queryKey: ['finance-budgets', year, month],
    queryFn: () => api.finance.listBudgets(year, month),
    staleTime: 1000 * 30,
  });

  const upsertMut = useMutation({
    mutationFn: (payload: { year: number | null; month: number | null; category: string | null; amount: number }) =>
      api.finance.upsertBudget(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-budgets'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.finance.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-budgets'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const budgets = budgetsQ.data ?? [];

  function getBudget(category: string | null) {
    // Exact month match takes priority over recurring
    return (
      budgets.find((b) => b.category === category && b.year === year && b.month === month) ??
      budgets.find((b) => b.category === category && b.year === null && b.month === null)
    );
  }

  function handleSave(category: string | null, amount: number) {
    upsertMut.mutate({ year, month, category, amount });
  }

  function handleDelete(category: string | null) {
    const b = getBudget(category);
    if (b) deleteMut.mutate(b.id);
  }

  const categories = meta?.expense_categories ?? [];
  const spentByCategory = Object.fromEntries(
    (summary?.by_category ?? []).map((s) => [s.category, s.total])
  );
  const totalSpent = summary?.total_expense ?? 0;
  const overallBudget = getBudget(null);

  return (
    <div className="space-y-6">
      {/* Overall budget */}
      <div className="card">
        <div className="card-title">Overall Monthly Budget</div>
        <div className="space-y-3">
          <BudgetRow
            label="Total spending limit"
            spent={totalSpent}
            budgetEntry={overallBudget}
            currency={currency}
            year={year}
            month={month}
            category={null}
            onSave={(amt) => handleSave(null, amt)}
            onDelete={() => handleDelete(null)}
          />
          {overallBudget && (
            <p className={cn(
              'text-xs',
              totalSpent > overallBudget.amount
                ? 'text-red-400'
                : totalSpent > overallBudget.amount * 0.8
                ? 'text-amber-400'
                : 'text-emerald-400',
            )}>
              {totalSpent > overallBudget.amount
                ? `Over budget by ${fmt(totalSpent - overallBudget.amount, currency)}`
                : `${fmt(overallBudget.amount - totalSpent, currency)} remaining`}
            </p>
          )}
        </div>
      </div>

      {/* Per-category budgets */}
      <div className="card">
        <div className="card-title">Category Budgets</div>
        <p className="text-xs text-ink-600 mb-4">
          Set limits for individual spending categories. The AI will warn you when you're close to
          or over your limit.
        </p>
        <div className="space-y-4">
          {categories.map((cat) => (
            <BudgetRow
              key={cat}
              label={`${meta?.category_emoji[cat] ?? '📌'} ${cat}`}
              spent={spentByCategory[cat] ?? 0}
              budgetEntry={getBudget(cat)}
              currency={currency}
              year={year}
              month={month}
              category={cat}
              onSave={(amt) => handleSave(cat, amt)}
              onDelete={() => handleDelete(cat)}
            />
          ))}
        </div>

        <p className="text-[10px] text-ink-700 mt-4 border-t border-ink-900 pt-3">
          Budgets with no year/month set are recurring and apply every month. Setting one for a
          specific month overrides the recurring limit for that month only.
        </p>
      </div>
    </div>
  );
}
