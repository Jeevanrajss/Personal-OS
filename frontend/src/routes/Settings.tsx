import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { api, ProviderPreset, LLMTestResult } from '@/lib/api';

// ---------------------------------------------------------------------------
// Provider tile data
// ---------------------------------------------------------------------------
const PROVIDER_ORDER = [
  'local',
  'openai',
  'anthropic',
  'google',
  'groq',
  'together',
  'mistral',
  'custom',
] as const;

type ProviderId = (typeof PROVIDER_ORDER)[number];

// ---------------------------------------------------------------------------
// Helper: small info card
// ---------------------------------------------------------------------------
function InfoCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 flex gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-semibold text-sm text-ink-800 dark:text-ink-100 mb-1">{title}</p>
        <p className="text-xs text-ink-500 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: model input with dropdown suggestions
// ---------------------------------------------------------------------------
function ModelField({
  label,
  value,
  onChange,
  suggestions,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  disabled?: boolean;
  placeholder?: string;
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
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-xs font-medium text-ink-500">{label}</label>
      <div className="relative">
        <input
          className="input w-full pr-8"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'model-id'}
          disabled={disabled}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {suggestions.length > 0 && !disabled && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            onClick={() => setOpen(o => !o)}
          >
            ▾
          </button>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-52 overflow-auto">
            {suggestions.map(s => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
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

  // --- Remote data ---
  const { data: providers = {} } = useQuery({
    queryKey: ['settings-providers'],
    queryFn: api.settings.getProviders,
  });

  const { data: savedSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['settings-all'],
    queryFn: api.settings.getAll,
  });

  // Live model list from the currently-configured provider (for suggestions)
  const { data: liveModelsResp } = useQuery({
    queryKey: ['settings-models'],
    queryFn: api.settings.listModels,
    retry: false,
    staleTime: 60_000,
  });
  const liveModels = liveModelsResp?.models ?? [];

  // --- Local form state ---
  const [provider, setProvider] = useState<ProviderId>('local');
  const [apiBase, setApiBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [fastModel, setFastModel] = useState('');
  const [embedModel, setEmbedModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null);

  // Populate form once settings load
  const initialised = useRef(false);
  useEffect(() => {
    if (!savedSettings || initialised.current) return;
    initialised.current = true;
    setProvider((savedSettings['ai.provider'] as ProviderId) || 'local');
    setApiBase(savedSettings['ai.api_base'] || '');
    setApiKey(savedSettings['ai.api_key'] || '');
    setChatModel(savedSettings['ai.chat_model'] || '');
    setFastModel(savedSettings['ai.fast_model'] || '');
    setEmbedModel(savedSettings['ai.embed_model'] || '');
  }, [savedSettings]);

  // When provider tile is clicked, pre-fill api_base and clear models
  function selectProvider(pid: ProviderId) {
    const preset: ProviderPreset | undefined = providers[pid];
    setProvider(pid);
    if (preset?.api_base) setApiBase(preset.api_base);
    setChatModel(preset?.suggested_chat?.[0] ?? '');
    setFastModel(preset?.suggested_chat?.[1] ?? preset?.suggested_chat?.[0] ?? '');
    setEmbedModel(preset?.embed_supported !== false ? (preset?.suggested_embed ?? '') : '');
    setDirty(true);
    setTestResult(null);
  }

  function markDirty() { setDirty(true); setTestResult(null); }

  // --- Mutations ---
  const saveMut = useMutation({
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
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['settings-all'] });
      qc.invalidateQueries({ queryKey: ['settings-models'] });
    },
  });

  const testMut = useMutation({
    mutationFn: async () => {
      // Save first so backend uses the new config
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
      setDirty(false);
    },
    onError: (e: Error) => {
      setTestResult({ ok: false, provider, model: chatModel, response: null, error: e.message });
    },
  });

  const preset: ProviderPreset | undefined = providers[provider];
  const suggestedChat = [
    ...(preset?.suggested_chat ?? []),
    ...(liveModels ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);
  const embedSupported = preset?.embed_supported !== false;

  // Link to get an API key for the chosen provider
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
        <PageHeader title="Settings" subtitle="AI provider, API keys, model config." />
        <div className="flex items-center justify-center py-20 text-ink-400">Loading…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Connect any AI provider or use local models." />

      <div className="space-y-6 max-w-2xl">

        {/* ── Provider picker ── */}
        <section className="card p-5">
          <h2 className="font-semibold text-sm text-ink-700 dark:text-ink-200 mb-3">AI Provider</h2>
          <div className="grid grid-cols-4 gap-2">
            {PROVIDER_ORDER.map(pid => {
              const p: ProviderPreset | undefined = providers[pid];
              const active = provider === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => selectProvider(pid)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-2 text-center transition-all
                    ${active
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-violet-300'}`}
                >
                  <span className="text-xl">{p?.emoji ?? '🔧'}</span>
                  <span className="text-[11px] font-medium text-ink-700 dark:text-ink-200 leading-tight">
                    {p?.label ?? pid}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Connection details ── */}
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-ink-700 dark:text-ink-200">Connection</h2>

          {/* API base URL (always shown; read-only for non-custom presets unless user edits) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-500">API Base URL</label>
            <input
              className="input w-full font-mono text-sm"
              value={apiBase}
              onChange={e => { setApiBase(e.target.value); markDirty(); }}
              placeholder="http://127.0.0.1:1234/v1"
            />
          </div>

          {/* API Key (hidden for local unless user wants) */}
          {provider !== 'local' && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink-500">
                  API Key
                  {preset?.needs_key && <span className="ml-1 text-rose-500">*</span>}
                </label>
                {keyLinks[provider] && (
                  <a
                    href={keyLinks[provider]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-violet-500 hover:underline"
                  >
                    Get key ↗
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  className="input w-full pr-10 font-mono text-sm"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); markDirty(); }}
                  placeholder={preset?.needs_key ? 'sk-…' : 'optional'}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 text-xs"
                  onClick={() => setShowKey(v => !v)}
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Masked indicator when value is dots (server-masked) */}
              {apiKey && /^•+$/.test(apiKey) && (
                <p className="text-[11px] text-ink-400">
                  Key saved — type a new one to replace it.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Models ── */}
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-ink-700 dark:text-ink-200">Models</h2>

          <ModelField
            label="Chat / Main model"
            value={chatModel}
            onChange={v => { setChatModel(v); markDirty(); }}
            suggestions={suggestedChat}
            placeholder="e.g. gpt-4o"
          />

          <ModelField
            label="Fast model (categorisation, quick tasks)"
            value={fastModel}
            onChange={v => { setFastModel(v); markDirty(); }}
            suggestions={suggestedChat}
            placeholder="e.g. gpt-4o-mini"
          />

          {embedSupported ? (
            <ModelField
              label="Embedding model (semantic search)"
              value={embedModel}
              onChange={v => { setEmbedModel(v); markDirty(); }}
              suggestions={preset?.suggested_embed ? [preset.suggested_embed] : []}
              placeholder="e.g. nomic-embed-text-v1.5"
            />
          ) : (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ {preset?.label ?? provider} does not provide an embeddings API. Semantic search
              and journal vector features will be disabled.
            </div>
          )}
        </section>

        {/* ── Test result banner ── */}
        {testResult && (
          <div
            className={`rounded-xl px-4 py-3 text-sm flex items-start gap-3 ${
              testResult.ok
                ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
            }`}
          >
            <span className="text-lg">{testResult.ok ? '✅' : '❌'}</span>
            <div>
              {testResult.ok ? (
                <>
                  <p className="font-semibold">Connected to {testResult.provider} · {testResult.model}</p>
                  {testResult.response && (
                    <p className="mt-0.5 text-xs opacity-80 italic">"{testResult.response}"</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold">Connection failed</p>
                  <p className="mt-0.5 text-xs opacity-80">{testResult.error}</p>
                </>
              )}
            </div>
            <button
              type="button"
              className="ml-auto text-current opacity-50 hover:opacity-100"
              onClick={() => setTestResult(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={!dirty || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? 'Saving…' : 'Save Settings'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={testMut.isPending}
            onClick={() => testMut.mutate()}
          >
            {testMut.isPending ? 'Testing…' : '🔌 Test Connection'}
          </button>
        </div>

        {/* ── Info cards ── */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon="🔒" title="Privacy">
            Your API key is stored only in the local encrypted SQLite database on your machine.
            It is never sent to Anthropic, the app developer, or any third party.
          </InfoCard>
          <InfoCard icon="🌐" title="Online vs Local">
            Cloud providers (OpenAI, Anthropic, etc.) send your data to their servers.
            Local providers (LM Studio, Ollama) run entirely on your device with no data leaving.
          </InfoCard>
        </div>

      </div>
    </>
  );
}
