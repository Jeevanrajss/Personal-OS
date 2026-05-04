import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

export function FinanceInsightsCard() {
  const [insights, setInsights] = useState<string[] | null>(null);

  const mut = useMutation({
    mutationFn: () => api.finance.insights(),
    onSuccess: (data) => setInsights(data.insights),
  });

  const offline = mut.isError && (mut.error as Error).message.includes('503');

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <div className="card-title !mb-0">AI Insights</div>
        </div>
        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          title={insights ? 'Regenerate' : 'Generate insights'}
          className="p-1 rounded-md border border-transparent text-ink-500 hover:text-accent hover:border-ink-800 disabled:opacity-40 transition-colors"
        >
          {mut.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {mut.isPending && !insights && (
        <div className="space-y-2">
          {[90, 75, 60].map((w, i) => (
            <div key={i} className="h-3 bg-ink-800 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {offline && <p className="text-xs text-amber-400">LM Studio is offline.</p>}
      {mut.isError && !offline && <p className="text-xs text-red-400">{(mut.error as Error).message}</p>}

      {insights && insights.length === 0 && (
        <p className="text-xs text-ink-600">No data yet — add some transactions first.</p>
      )}

      {insights && insights.length > 0 && (
        <ul className="space-y-2">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-ink-300 leading-relaxed">{ins}</p>
            </li>
          ))}
        </ul>
      )}

      {!insights && !mut.isPending && !mut.isError && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink-500">Compare this month vs last month.</p>
          <button
            type="button"
            onClick={() => mut.mutate()}
            className="text-xs text-accent hover:underline shrink-0"
          >
            Generate
          </button>
        </div>
      )}
    </div>
  );
}
