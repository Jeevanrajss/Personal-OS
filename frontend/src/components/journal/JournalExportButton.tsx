import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toISODate } from '@/lib/date';

/**
 * Export button + small date-range picker modal.
 * Downloads a Markdown file from the backend.
 */
export function JournalExportButton() {
  const [open, setOpen] = useState(false);

  const today = toISODate(new Date());
  const defaultStart = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toISODate(d);
  })();

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(today);
  const [loading, setLoading] = useState(false);

  function handleExport() {
    if (!start || !end || start > end) return;
    setLoading(true);
    try {
      api.journal.export(start, end);
    } finally {
      // Download is triggered by a link click — no await needed.
      setTimeout(() => setLoading(false), 800);
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ink-800
          bg-ink-900 text-xs text-ink-400 hover:text-ink-100 hover:border-ink-700 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-ink-950 border border-ink-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-ink-100">Export Journal</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-ink-500 hover:text-ink-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-ink-500 mb-1">From</label>
                <input
                  type="date"
                  value={start}
                  max={end}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-ink-900 border border-ink-800 rounded-md px-3 py-2
                    text-sm text-ink-100 outline-none focus:border-accent/60
                    [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1">To</label>
                <input
                  type="date"
                  value={end}
                  min={start}
                  max={today}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-ink-900 border border-ink-800 rounded-md px-3 py-2
                    text-sm text-ink-100 outline-none focus:border-accent/60
                    [color-scheme:dark]"
                />
              </div>

              <p className="text-[11px] text-ink-400">
                Exports as Markdown (.md) — includes mood, tags, daily summary, and all entries.
              </p>

              {/* Quick range shortcuts */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Last 7d', days: 7 },
                  { label: 'Last 30d', days: 30 },
                  { label: 'Last 90d', days: 90 },
                  { label: 'This year', year: true },
                ].map(({ label, days, year }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      const e = new Date();
                      setEnd(toISODate(e));
                      if (year) {
                        setStart(`${e.getFullYear()}-01-01`);
                      } else {
                        const s = new Date(e);
                        s.setDate(s.getDate() - (days! - 1));
                        setStart(toISODate(s));
                      }
                    }}
                    className="px-2.5 py-1 rounded-md border border-ink-800 bg-ink-900
                      text-[11px] text-ink-400 hover:text-ink-200 hover:border-ink-700 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 px-3 py-2 rounded-lg border border-ink-800 bg-ink-900
                  text-sm text-ink-400 hover:text-ink-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!start || !end || start > end || loading}
                className="flex-1 px-3 py-2 rounded-lg bg-accent/20 border border-accent/40
                  text-sm text-accent hover:bg-accent/30 disabled:opacity-40
                  disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                {loading ? 'Exporting…' : 'Download .md'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
