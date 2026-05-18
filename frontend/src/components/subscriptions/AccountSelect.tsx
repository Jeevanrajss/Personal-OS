import { useQuery } from '@tanstack/react-query';
import { api, type Account, type AccountType, type PaymentType } from '@/lib/api';

export const TYPE_EMOJI: Record<string, string> = {
  credit_card: '💳',
  debit_card:  '🏧',
  savings:     '🏦',
  wallet:      '👛',
  upi:         '📱',
  cash:        '💵',
};

/** Maps account type → the most natural payment type for subscriptions. */
export const ACCOUNT_TO_PAYMENT_TYPE: Partial<Record<AccountType, PaymentType>> = {
  credit_card: 'credit_card',
  debit_card:  'debit_card',
  savings:     'net_banking',
  wallet:      'wallet',
  upi:         'upi',
};

export function accountDisplayLabel(acc: Account): string {
  const base = acc.nickname ?? acc.name;
  const suffix = acc.last4 ? ` ···${acc.last4}` : '';
  return `${base}${suffix}`;
}

type Props = {
  value: string;
  onChange: (label: string) => void;
  /** Called with the full Account whenever the user picks one (null = cleared). */
  onAccountPicked?: (account: Account | null) => void;
  className?: string;
};

/**
 * Dropdown of the user's saved accounts.
 * Falls back to a free-text <input> if no accounts exist yet.
 * onAccountPicked fires with the full Account so callers can auto-fill payment type.
 */
export function AccountSelect({ value, onChange, onAccountPicked, className }: Props) {
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list(),
    staleTime: 60_000,
  });

  const activeAccounts = accounts.filter((a) => a.is_active);

  // No accounts saved yet → free-text fallback
  if (activeAccounts.length === 0) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Account (e.g. HDFC)"
        maxLength={60}
        className={className}
      />
    );
  }

  function handleChange(label: string) {
    onChange(label);
    if (onAccountPicked) {
      const match = activeAccounts.find((a) => accountDisplayLabel(a) === label);
      onAccountPicked(match ?? null);
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
    >
      <option value="">— Select account —</option>
      {activeAccounts.map((acc) => (
        <option key={acc.id} value={accountDisplayLabel(acc)}>
          {TYPE_EMOJI[acc.type] ?? '💳'} {accountDisplayLabel(acc)}
        </option>
      ))}
    </select>
  );
}
