type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;   // small ALL-CAPS label above the title (e.g. "FINANCE")
  action?: React.ReactNode;
  meta?: React.ReactNode; // small right-aligned label
};

export function PageHeader({ title, subtitle, eyebrow, action, meta }: Props) {
  return (
    <header className="mb-7">
      {eyebrow && (
        <p
          className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em]"
          style={{ color: 'var(--fg-4)' }}
        >
          {eyebrow}
        </p>
      )}
      <div className="flex items-end justify-between gap-6">
        {/* Title block */}
        <div className="min-w-0">
          <h1
            className="m-0 text-ink-50"
            style={{
              font: '500 56px/1.05 var(--font-display)',
              letterSpacing: '-0.025em',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2.5 text-sm" style={{ color: 'var(--fg-3)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: meta + action */}
        {(meta || action) && (
          <div className="flex items-center gap-2.5 shrink-0 mb-1">
            {meta && (
              <span
                className="text-[11px] uppercase tracking-wider"
                style={{ color: 'var(--fg-4)' }}
              >
                {meta}
              </span>
            )}
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
