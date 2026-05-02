import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { api, type Account, type AccountIn, type AccountType } from '@/lib/api';
import { cn } from '@/lib/cn';

const TYPE_OPTIONS: { value: AccountType; label: string; emoji: string }[] = [
  { value: 'savings',     label: 'Savings',      emoji: '🏦' },
  { value: 'credit_card', label: 'Credit Card',   emoji: '💳' },
  { value: 'debit_card',  label: 'Debit Card',    emoji: '💳' },
  { value: 'wallet',      label: 'Wallet',        emoji: '👛' },
  { value: 'upi',         label: 'UPI',           emoji: '📱' },
  { value: 'cash',        label: 'Cash',          emoji: '💵' },
];

const COLOR_OPTIONS = [
  { value: 'violet',  cls: 'bg-violet-500' },
  { value: 'sky',     cls: 'bg-sky-500' },
  { value: 'emerald', cls: 'bg-emerald-500' },
  { value: 'amber',   cls: 'bg-amber-500' },
  { value: 'rose',    cls: 'bg-rose-500' },
  { value: 'indigo',  cls: 'bg-indigo-500' },
  { value: 'teal',    cls: 'bg-teal-500' },
  { value: 'orange',  cls: 'bg-orange-500' },
];

type Props = {
  initial?: Account | null;
  onSubmit: (payload: AccountIn) => Promise<void>;
  onCancel: () => void;
};

export function AccountForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'savings');
  const [bank, setBank] = useState(initial?.bank ?? '');
  const [last4, setLast4] = useState(initial?.last4 ?? '');
  const [creditLimit, setCreditLimit] = useState(initial?.credit_limit ? String(initial.credit_limit) : '');
  const [benefitsJson, setBenefitsJson] = useState(initial?.benefits_json ?? '');
  const [color, setColor] = useState(initial?.color ?? 'violet');
  const [loading, setLoading] = useState(false);
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch static benefits when a known credit card name is entered
  async function fetchBenefits() {
    if (!name.trim() || type !== 'credit_card') return;
    setLoadingBenefits(true);
    try {
      const data = await api.accounts.cardBenefits(name.trim());
      if (data.source !== 'unknown') {
        setBenefitsJson(JSON.stringify({ perks: data.perks, cashback: data.cashback }, null, 2));
      }
    } catch {
      // ignore
    } finally {
      setLoadingBenefits(false);
    }
  }

  // When type changes to credit_card and name is set, try to auto-fill
  useEffect(() => {
    if (type === 'credit_card' && name && !benefitsJson) {
      fetchBenefits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        bank: bank.trim() || null,
        last4: last4.trim() || null,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
        benefits_json: benefitsJson.trim() || null,
        color,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Account type selector */}
      <div>
        <label className="block text-[11px] text-ink-500 uppercase tracking-wide mb-1.5">Type</label>
        <div className="grid grid-cols-3 gap-1.5">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors',
                type === t.value
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-ink-800 bg-ink-900 text-ink-500 hover:text-ink-300',
              )}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[11px] text-ink-500 uppercase tracking-wide mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { if (type === 'credit_card' && !benefitsJson) fetchBenefits(); }}
          placeholder={type === 'credit_card' ? 'e.g. HDFC Credit Card' : 'e.g. HDFC Savings'}
          maxLength={100}
          required
          className="w-full bg-ink-900 border border-ink-800 rounded-md px-3 py-2 text-sm outline-none focus:border-accent/60 placeholder:text-ink-600"
        />
      </div>

      {/* Bank + Last4 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-ink-500 uppercase tracking-wide mb-1">Bank</label>
          <input
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="e.g. HDFC"
            maxLength={60}
            className="w-full bg-ink-900 border border-ink-800 rounded-md px-3 py-2 text-sm outline-none focus:border-accent/60 placeholder:text-ink-600"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink-500 uppercase tracking-wide mb-1">
            Last 4 digits (optional)
          </label>
          <input
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            className="w-full bg-ink-900 border border-ink-800 rounded-md px-3 py-2 text-sm outline-none focus:border-accent/60 placeholder:text-ink-600"
          />
        </div>
      </div>

      {/* Credit limit — credit card only */}
      {type === 'credit_card' && (
        <div>
          <label className="block text-[11px] text-ink-500 uppercase tracking-wide mb-1">
            Credit Limit (optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">₹</span>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="e.g. 100000"
              min="0"
              className="w-full pl-7 pr-3 py-2 bg-ink-900 border border-ink-800 rounded-md text-sm outline-none focus:border-accent/60 [appearance:textfield]"
            />
          </div>
        </div>
      )}

      {/* Card benefits — credit card only */}
      {type === 'credit_card' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] text-ink-500 uppercase tracking-wide">
              Card Benefits (JSON)
            </label>
            <button
              type="button"
              onClick={fetchBenefits}
              disabled={loadingBenefits || !name.trim()}
              className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/70 disabled:opacity-40 transition-colors"
            >
              {loadingBenefits
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Sparkles className="w-3 h-3" />}
              Auto-fill from card database
            </button>
          </div>
          <textarea
            value={benefitsJson}
            onChange={(e) => setBenefitsJson(e.target.value)}
            rows={5}
            placeholder={'{\n  "perks": ["5% on dining"],\n  "cashback": {"Food & Dining": 5}\n}'}
            className="w-full bg-ink-900 border border-ink-800 rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-accent/60 placeholder:text-ink-700 resize-none"
          />
          <p className="text-[10px] text-ink-600 mt-1">
            Benefits are used by the AI to suggest the best card for each purchase.
          </p>
        </div>
      )}

      {/* Color picker */}
      <div>
        <label className="block text-[11px] text-ink-500 uppercase tracking-wide mb-1.5">Color</label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                'w-6 h-6 rounded-full transition-all',
                c.cls,
                color === c.value ? 'ring-2 ring-offset-2 ring-offset-ink-950 ring-white scale-110' : 'opacity-60 hover:opacity-100',
              )}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 rounded-md text-sm font-medium bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 disabled:opacity-50 transition-colors"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            : initial ? 'Save Changes' : 'Add Account'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-ink-800 text-sm text-ink-400 hover:text-ink-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
