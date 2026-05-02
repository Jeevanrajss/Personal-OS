import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, type Account, type AccountIn } from '@/lib/api';
import { cn } from '@/lib/cn';
import { AccountForm } from './AccountForm';

const COLOR_BG: Record<string, string> = {
  violet:  'bg-violet-500/15 border-violet-500/30 text-violet-300',
  sky:     'bg-sky-500/15 border-sky-500/30 text-sky-300',
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  amber:   'bg-amber-500/15 border-amber-500/30 text-amber-300',
  rose:    'bg-rose-500/15 border-rose-500/30 text-rose-300',
  indigo:  'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
  teal:    'bg-teal-500/15 border-teal-500/30 text-teal-300',
  orange:  'bg-orange-500/15 border-orange-500/30 text-orange-300',
};

const COLOR_DOT: Record<string, string> = {
  violet:  'bg-violet-500',
  sky:     'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  indigo:  'bg-indigo-500',
  teal:    'bg-teal-500',
  orange:  'bg-orange-500',
};

const TYPE_EMOJI: Record<string, string> = {
  savings:     '🏦',
  credit_card: '💳',
  debit_card:  '💳',
  wallet:      '👛',
  upi:         '📱',
  cash:        '💵',
};

const TYPE_LABEL: Record<string, string> = {
  savings:     'Savings',
  credit_card: 'Credit Card',
  debit_card:  'Debit Card',
  wallet:      'Wallet',
  upi:         'UPI',
  cash:        'Cash',
};

function parseBenefits(json: string | null): { perks: string[]; cashback: Record<string, number> } {
  if (!json) return { perks: [], cashback: {} };
  try {
    const d = JSON.parse(json);
    return {
      perks: Array.isArray(d.perks) ? d.perks : [],
      cashback: typeof d.cashback === 'object' && d.cashback !== null ? d.cashback : {},
    };
  } catch {
    return { perks: [], cashback: {} };
  }
}

export function AccountsCard() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const accountsQ = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list(),
    staleTime: 1000 * 60,
  });

  const createMut = useMutation({
    mutationFn: (payload: AccountIn) => api.accounts.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AccountIn }) => api.accounts.update(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.accounts.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const accounts = accountsQ.data ?? [];
  const creditCards = accounts.filter((a) => a.type === 'credit_card');
  const others = accounts.filter((a) => a.type !== 'credit_card');

  function AccountRow({ acct }: { acct: Account }) {
    const isOpen = expanded === acct.id;
    const benefits = parseBenefits(acct.benefits_json);
    const colorKey = acct.color ?? 'violet';

    if (editing?.id === acct.id) {
      return (
        <div className="rounded-lg border border-ink-800 bg-ink-900 p-4">
          <AccountForm
            initial={editing}
            onSubmit={async (p) => { await updateMut.mutateAsync({ id: acct.id, patch: p }); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-ink-800 bg-ink-900/50 overflow-hidden">
        {/* Header row */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-ink-900 transition-colors"
          onClick={() => setExpanded(isOpen ? null : acct.id)}
        >
          {/* Color dot + emoji */}
          <div className={cn('w-2 h-2 rounded-full shrink-0', COLOR_DOT[colorKey] ?? 'bg-violet-500')} />
          <span className="text-base shrink-0">{TYPE_EMOJI[acct.type] ?? '🏦'}</span>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-100 truncate">{acct.name}</div>
            <div className="text-[11px] text-ink-500 flex items-center gap-1.5">
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px] border',
                COLOR_BG[colorKey] ?? COLOR_BG.violet,
              )}>
                {TYPE_LABEL[acct.type]}
              </span>
              {acct.bank && <span>{acct.bank}</span>}
              {acct.last4 && <span>••••{acct.last4}</span>}
              {acct.credit_limit && (
                <span>Limit: ₹{acct.credit_limit.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>

          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setEditing(acct)}
              className="p-1.5 rounded text-ink-600 hover:text-ink-300 hover:bg-ink-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { if (confirm(`Remove "${acct.name}"?`)) deleteMut.mutate(acct.id); }}
              className="p-1.5 rounded text-ink-600 hover:text-red-400 hover:bg-ink-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded benefits — credit cards only */}
        {isOpen && acct.type === 'credit_card' && (
          <div className="border-t border-ink-800 px-4 py-3 space-y-3">
            {benefits.perks.length > 0 && (
              <div>
                <p className="text-[10px] text-ink-500 uppercase tracking-wide mb-1.5">Perks</p>
                <ul className="space-y-1">
                  {benefits.perks.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-ink-300">
                      <span className="text-accent mt-0.5 shrink-0">✦</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Object.keys(benefits.cashback).length > 0 && (
              <div>
                <p className="text-[10px] text-ink-500 uppercase tracking-wide mb-1.5">Cashback rates</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(benefits.cashback).map(([cat, pct]) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    >
                      {cat}: {pct}%
                    </span>
                  ))}
                </div>
              </div>
            )}
            {benefits.perks.length === 0 && Object.keys(benefits.cashback).length === 0 && (
              <p className="text-xs text-ink-600">
                No benefits saved yet. Edit to add benefits, or click "Auto-fill from card database".
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add account button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500">
          {accounts.length === 0
            ? 'Add your bank accounts and credit cards to enable smart card suggestions.'
            : `${accounts.length} account${accounts.length !== 1 ? 's' : ''} — ${creditCards.length} credit card${creditCards.length !== 1 ? 's' : ''}`}
        </p>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setEditing(null); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors',
            showForm
              ? 'border-ink-700 bg-ink-900 text-ink-400'
              : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
          )}
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <div className="card-title">New Account</div>
          <AccountForm
            onSubmit={async (p) => { await createMut.mutateAsync(p); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {accountsQ.isLoading && (
        <div className="py-8 text-center text-xs text-ink-500">Loading accounts…</div>
      )}

      {/* Credit cards section */}
      {creditCards.length > 0 && (
        <div>
          <h3 className="text-[11px] text-ink-500 uppercase tracking-wide mb-2">
            Credit Cards
            <span className="ml-1.5 text-ink-700">(click to view benefits)</span>
          </h3>
          <div className="space-y-2">
            {creditCards.map((a) => <AccountRow key={a.id} acct={a} />)}
          </div>
        </div>
      )}

      {/* Other accounts */}
      {others.length > 0 && (
        <div>
          <h3 className="text-[11px] text-ink-500 uppercase tracking-wide mb-2">Other Accounts</h3>
          <div className="space-y-2">
            {others.map((a) => <AccountRow key={a.id} acct={a} />)}
          </div>
        </div>
      )}

      {accounts.length === 0 && !accountsQ.isLoading && !showForm && (
        <div className="py-10 text-center text-sm text-ink-600 border border-dashed border-ink-800 rounded-lg">
          No accounts yet — add your first one above.
        </div>
      )}
    </div>
  );
}
