import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Loader2, RefreshCw, Wifi } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { api, ProviderPreset, LLMTestResult } from '@/lib/api';
import { cn } from '@/lib/cn';
import { CURRENCY_OPTS } from '@/components/subscriptions/subUtils';

// ---------------------------------------------------------------------------
// Shared input / button styles (match the rest of the app)
// ---------------------------------------------------------------------------
const inputCls =
  'w-full bg-ink-900 border border-ink-800 rounded-md px-2.5 py-1.5 text-sm text-ink-200 outline-none focus:border-accent/60 placeholder:text-ink-600 disabled:opacity-50';

const selectCls =
  'w-full bg-ink-900 border border-ink-800 rounded-md px-2.5 py-1.5 text-sm text-ink-200 outline-none focus:border-accent/60';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] text-ink-500 uppercase tracking-wide mb-0.5">
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium text-ink-300 mb-4">{children}</h2>
  );
}

function BtnPrimary({
  onClick, disabled, children,
}: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-md bg-accent/20 border border-accent/40 text-xs text-accent hover:bg-accent/30 disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  );
}

function BtnSecondary({
  onClick, disabled, children,
}: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-md bg-ink-900 border border-ink-800 text-xs text-ink-400 hover:text-ink-200 hover:border-ink-700 disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Provider tile order
// ---------------------------------------------------------------------------
const PROVIDER_ORDER = [
  'local', 'openai', 'anthropic', 'google',
  'groq', 'together', 'mistral', 'custom',
] as const;
type ProviderId = (typeof PROVIDER_ORDER)[number];

// ---------------------------------------------------------------------------
// Model input with live suggestions dropdown
// ---------------------------------------------------------------------------
function ModelField({
  label, value, onChange, suggestions, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref}>
      <Label>{label}</Label>
      <div className="relative">
        <input
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'model-id'}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {suggestions.length > 0 && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 text-xs"
            onClick={() => setOpen((o) => !o)}
          >
            ▾
          </button>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full bg-ink-900 border border-ink-700 rounded-md shadow-xl max-h-48 overflow-auto">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                  onClick={() => { onChange(s); setOpen(false); }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings page
// ---------------------------------------------------------------------------
export function Settings() {
  const qc = useQueryClient();

  // ── Remote data ────────────────────────────────────────────────────
  const { data: providers = {} } = useQuery({
    queryKey: ['settings-providers'],
    queryFn: api.settings.getProviders,
  });

  const { data: savedSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['settings-all'],
    queryFn: api.settings.getAll,
  });

  const { data: liveModelsResp } = useQuery({
    queryKey: ['settings-models'],
    queryFn: api.settings.listModels,
    retry: false,
    staleTime: 60_000,
  });
  const liveModels = liveModelsResp?.models ?? [];

  // ── Profile form state ─────────────────────────────────────────────
  const [profileName, setProfileName] = useState('');
  const [profileCurrency, setProfileCurrency] = useState('INR');
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // ── AI form state ──────────────────────────────────────────────────
  const [provider, setProvider] = useState<ProviderId>('local');
  const [apiBase, setApiBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [fastModel, setFastModel] = useState('');
  const [embedModel, setEmbedModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [aiDirty, setAiDirty] = useState(false);
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null);

  // Populate forms once settings load (run once only)
  const initialised = useRef(false);
  useEffect(() => {
    if (!savedSettings || initialised.current) return;
    initialised.current = true;

    // Profile — prefer backend value, fall back to localStorage
    const backendName = (savedSettings['profile.name'] as string) || '';
    const backendCurrency = (savedSettings['profile.currency'] as string) || '';
    const lsName = localStorage.getItem('user_name') ?? '';
    const lsCurrency = localStorage.getItem('sub_display_currency') ?? 'INR';

    const name = backendName || lsName;
    const currency = backendCurrency || lsCurrency;
    setProfileName(name);
    setProfileCurrency(currency);
    // Sync localStorage from backend values
    if (name) localStorage.setItem('user_name', name);
    if (currency) localStorage.setItem('sub_display_currency', currency);

    // AI
    setProvider((savedSettings['ai.provider'] as ProviderId) || 'local');
    setApiBase((savedSettings['ai.api_base'] as string) || '');
    setApiKey((savedSettings['ai.api_key'] as string) || '');
    setChatModel((savedSettings['ai.chat_model'] as string) || '');
    setFastModel((savedSettings['ai.fast_model'] as string) || '');
    setEmbedModel((savedSettings['ai.embed_model'] as string) || '');
  }, [savedSettings]);

  // ── Provider tile selection ────────────────────────────────────────
  function selectProvider(pid: ProviderId) {
    const preset: ProviderPreset | undefined = providers[pid];
    setProvider(pid);
    if (preset?.api_base) setApiBase(preset.api_base);
    setChatModel(preset?.suggested_chat?.[0] ?? '');
    setFastModel(preset?.suggested_chat?.[1] ?? preset?.suggested_chat?.[0] ?? '');
    setEmbedModel(preset?.embed_supported !== false ? (preset?.suggested_embed ?? '') : '');
    setAiDirty(true);
    setTestResult(null);
  }

  // ── Mutations ──────────────────────────────────────────────────────
  const profileMut = useMutation({
    mutationFn: () =>
      api.settings.update({
        'profile.name': profileName.trim(),
        'profile.currency': profileCurrency,
      }),
    onSuccess: () => {
      localStorage.setItem('user_name', profileName.trim());
      localStorage.setItem('sub_display_currency', profileCurrency);
      setProfileDirty(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ['settings-all'] });
    },
  });

  const aiSaveMut = useMutation({
    mutationFn: () =>
      api.settings.update({
        'ai.provider': provider,
        'ai.api_base': apiBase,
        'ai.api_key': apiKey,
        'ai.chat_model': chatModel,
        'ai.fast_model': fastModel,
        'ai.embed_model': embedModel,
        'ai.is_anthropic': String(providers[provider]?.is_anthropic ?? false),
      }),
    onSuccess: () => {
      setAiDirty(false);
      qc.invalidateQueries({ queryKey: ['settings-all'] });
      qc.invalidateQueries({ queryKey: ['settings-models'] });
    },
  });

  const testMut = useMutation({
    mutationFn: async () => {
      await api.settings.update({
        'ai.provider': provider,
        'ai.api_base': apiBase,
        'ai.api_key': apiKey,
        'ai.chat_model': chatModel,
        'ai.fast_model': fastModel,
        'ai.embed_model': embedModel,
        'ai.is_anthropic': String(providers[provider]?.is_anthropic ?? false),
      });
      qc.invalidateQueries({ queryKey: ['settings-all'] });
      qc.invalidateQueries({ queryKey: ['settings-models'] });
      return api.settings.testLLM();
    },
    onSuccess: (result) => {
      setTestResult(result);
      setAiDirty(false);
    },
    onError: (e: Error) => {
      setTestResult({ ok: false, provider, model: chatModel, response: null, error: e.message });
    },
  });

  const preset: ProviderPreset | undefined = providers[provider];
  const suggestedChat = [
    ...(preset?.suggested_chat ?? []),
    ...liveModels,
  ].filter((v, i, a) => a.indexOf(v) === i);
  const embedSupported = preset?.embed_supported !== false;

  const keyLinks: Record<string, string> = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/keys',
    google: 'https://aistudio.google.com/app/apikey',
    groq: 'https://console.groq.com/keys',
    together: 'https://api.together.xyz/settings/api-keys',
    mistral: 'https://console.mistral.ai/api-keys/',
  };

  if (loadingSettings) {
    return (
      <>
        <PageHeader title="Settings" subtitle="Profile, preferences, and AI configuration." />
        <div className="flex items-center justify-center py-20 text-ink-500 text-sm">Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, preferences, and AI configuration." />

      <div className="space-y-6 max-w-2xl">

        {/* ── Profile ───────────────────────────────────────────── */}
        <section className="card">
          <SectionTitle>Profile</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Your name</Label>
              <input
                className={inputCls}
                value={profileName}
                onChange={(e) => { setProfileName(e.target.value); setProfileDirty(true); }}
                placeholder="e.g. Jeevan"
                maxLength={60}
              />
              <p className="text-[10px] text-ink-700 mt-0.5">Shown in the dashboard greeting.</p>
            </div>

            <div>
              <Label>Display currency</Label>
              <select
                className={selectCls}
                value={profileCurrency}
                onChange={(e) => { setProfileCurrency(e.target.value); setProfileDirty(true); }}
              >
                {CURRENCY_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-ink-700 mt-0.5">Used in subscriptions and dashboard stats.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BtnPrimary
              onClick={() => profileMut.mutate()}
              disabled={!profileDirty || profileMut.isPending}
            >
              {profileMut.isPending ? 'Saving…' : 'Save profile'}
            </BtnPrimary>
            {profileSaved && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {profileMut.isError && (
              <span className="text-[11px] text-red-400">
                {(profileMut.error as Error).message}
              </span>
            )}
          </div>
        </section>

        {/* ── AI Provider ───────────────────────────────────────── */}
        <section className="card">
          <SectionTitle>AI Provider</SectionTitle>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {PROVIDER_ORDER.map((pid) => {
              const p: ProviderPreset | undefined = providers[pid];
              const active = provider === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => selectProvider(pid)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border py-3 px-2 text-center transition-all',
                    active
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-ink-800 bg-ink-950 hover:border-ink-700 hover:bg-ink-900',
                  )}
                >
                  <span className="text-xl">{p?.emoji ?? '🔧'}</span>
                  <span className={cn(
                    'text-[10px] font-medium leading-tight',
                    active ? 'text-accent' : 'text-ink-400',
                  )}>
                    {p?.label ?? pid}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Connection */}
          <div className="space-y-3 mb-5">
            <div>
              <Label>API base URL</Label>
              <input
                className={cn(inputCls, 'font-mono text-xs')}
                value={apiBase}
                onChange={(e) => { setApiBase(e.target.value); setAiDirty(true); }}
                placeholder="http://127.0.0.1:1234/v1"
              />
            </div>

            {provider !== 'local' && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <Label>
                    API key{preset?.needs_key && <span className="ml-1 text-red-400 normal-case">required</span>}
                  </Label>
                  {keyLinks[provider] && (
                    <a
                      href={keyLinks[provider]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline"
                    >
                      Get key ↗
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    className={cn(inputCls, 'pr-9 font-mono text-xs')}
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setAiDirty(true); }}
                    placeholder={preset?.needs_key ? 'sk-…' : 'optional'}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey
                      ? <EyeOff className="w-3.5 h-3.5" />
                      : <Eye className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
                {apiKey && /^•+$/.test(apiKey) && (
                  <p className="text-[10px] text-ink-600 mt-0.5">
                    Key saved — type a new one to replace it.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Models */}
          <div className="space-y-3 mb-5">
            <Label>Models</Label>

            <ModelField
              label="Chat / main model"
              value={chatModel}
              onChange={(v) => { setChatModel(v); setAiDirty(true); }}
              suggestions={suggestedChat}
              placeholder="e.g. gpt-4o"
            />

            <ModelField
              label="Fast model (quick tasks, categorisation)"
              value={fastModel}
              onChange={(v) => { setFastModel(v); setAiDirty(true); }}
              suggestions={suggestedChat}
              placeholder="e.g. gpt-4o-mini"
            />

            {embedSupported ? (
              <ModelField
                label="Embedding model (semantic search)"
                value={embedModel}
                onChange={(v) => { setEmbedModel(v); setAiDirty(true); }}
                suggestions={preset?.suggested_embed ? [preset.suggested_embed] : []}
                placeholder="e.g. nomic-embed-text-v1.5"
              />
            ) : (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs text-amber-400">
                {preset?.label ?? provider} does not support embeddings — semantic search will be disabled.
              </div>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div className={cn(
              'rounded-md px-3 py-2.5 text-sm flex items-start gap-2.5 mb-4',
              testResult.ok
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/25 text-red-300',
            )}>
              <span className="text-base shrink-0">{testResult.ok ? '✅' : '❌'}</span>
              <div className="flex-1 min-w-0">
                {testResult.ok ? (
                  <>
                    <p className="font-medium text-xs">
                      Connected · {testResult.provider} · {testResult.model}
                    </p>
                    {testResult.response && (
                      <p className="text-[11px] text-emerald-500 mt-0.5 italic">"{testResult.response}"</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium text-xs">Connection failed</p>
                    <p className="text-[11px] text-red-400 mt-0.5">{testResult.error}</p>
                  </>
                )}
              </div>
              <button
                type="button"
                className="text-ink-500 hover:text-ink-300 shrink-0"
                onClick={() => setTestResult(null)}
              >
                ✕
              </button>
            </div>
          )}

          {/* AI action buttons */}
          <div className="flex items-center gap-2">
            <BtnPrimary
              onClick={() => aiSaveMut.mutate()}
              disabled={!aiDirty || aiSaveMut.isPending}
            >
              {aiSaveMut.isPending ? 'Saving…' : 'Save AI settings'}
            </BtnPrimary>
            <BtnSecondary
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending}
            >
              {testMut.isPending
                ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Testing…</span>
                : <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> Test connection</span>
              }
            </BtnSecondary>
            {aiSaveMut.isSuccess && !aiDirty && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {aiSaveMut.isError && (
              <span className="text-[11px] text-red-400">
                {(aiSaveMut.error as Error).message}
              </span>
            )}
          </div>
        </section>

        {/* ── Privacy notes ─────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-xs font-medium text-ink-300 mb-1">🔒 Privacy</p>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Your API key is stored only in the local encrypted SQLite database on your machine.
              It is never sent to any third party.
            </p>
          </div>
          <div className="card">
            <p className="text-xs font-medium text-ink-300 mb-1">🌐 Local vs Cloud</p>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Cloud providers (OpenAI, Anthropic…) send prompts to their servers.
              Local (LM Studio, Ollama) runs entirely on your device.
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
