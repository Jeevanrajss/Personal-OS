import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const REPO = 'Jeevanrajss/North-OS';
const GITHUB_URL = `https://github.com/${REPO}`;
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ReleaseAssets {
  mac_arm?: string;
  mac_x64?: string;
  win?: string;
  version: string;
}

// ─────────────────────────────────────────────
// GitHub Releases hook — fetches latest version + asset URLs automatically
// ─────────────────────────────────────────────
function useLatestRelease(): { release: ReleaseAssets | null; loading: boolean } {
  const [release, setRelease] = useState<ReleaseAssets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => r.json())
      .then((data) => {
        const version: string = data.tag_name ?? '';
        const assets: Partial<ReleaseAssets> = { version };
        for (const asset of data.assets ?? []) {
          const n: string = asset.name ?? '';
          const url: string = asset.browser_download_url ?? '';
          if (n.endsWith('.dmg') && n.includes('arm64')) assets.mac_arm = url;
          else if (n.endsWith('.dmg') && n.includes('x64')) assets.mac_x64 = url;
          else if (n.endsWith('.exe') || n.endsWith('.msi')) assets.win = url;
        }
        setRelease(assets as ReleaseAssets);
      })
      .catch(() => setRelease({ version: 'latest' }))
      .finally(() => setLoading(false));
  }, []);

  return { release, loading };
}

// ─────────────────────────────────────────────
// Detect user OS for default download button
// ─────────────────────────────────────────────
function detectOS(): 'mac' | 'win' | 'other' {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'win';
  if (ua.includes('mac')) return 'mac';
  return 'other';
}

// ─────────────────────────────────────────────
// Copy button
// ─────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: copied ? '#9b8cff' : 'rgba(255,255,255,0.4)', transition: 'all .15s', whiteSpace: 'nowrap' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ─────────────────────────────────────────────
// Download + Email modal
// ─────────────────────────────────────────────
type Platform = 'mac_arm' | 'mac_x64' | 'win';
const PLATFORM_LABELS: Record<Platform, string> = {
  mac_arm: 'Mac — Apple Silicon (.dmg)',
  mac_x64: 'Mac — Intel (.dmg)',
  win: 'Windows (.exe)',
};

function DownloadModal({ platform, release, onClose }: { platform: Platform; release: ReleaseAssets; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
  const invalid = touched && !email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  const downloadUrl = release[platform];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return;
    setStatus('submitting');
    // Netlify form submission (silent)
    try {
      await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ 'form-name': 'north-os-download', email: email.trim(), platform }).toString() });
    } catch { /* ignore */ }
    setStatus('done');
    // Trigger download
    if (downloadUrl) {
      window.location.href = downloadUrl;
    } else {
      window.open(`${GITHUB_URL}/releases/latest`, '_blank', 'noopener');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Hidden Netlify form */}
      <form name="north-os-download" data-netlify="true" hidden>
        <input type="email" name="email" /><input type="text" name="platform" />
      </form>
      <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 40, background: '#13131a', border: '1px solid rgba(107,124,230,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 20, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>×</button>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⬇️</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 10, letterSpacing: '-0.02em' }}>Download starting…</h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
              We'll send update notifications to your inbox. Check your downloads folder in a moment.
            </p>
            {!downloadUrl && (
              <a href={`${GITHUB_URL}/releases/latest`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 16, fontSize: 13, color: '#9b8cff', textDecoration: 'underline' }}>
                Open GitHub Releases manually →
              </a>
            )}
          </div>
        ) : (
          <>
            <img src="/favicon.png" alt="" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 18 }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 6, letterSpacing: '-0.02em' }}>Download North OS</h3>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 100, background: 'rgba(107,124,230,0.12)', border: '1px solid rgba(107,124,230,0.25)', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: '#9b8cff' }}>{PLATFORM_LABELS[platform]}</span>
              {release.version && <span style={{ fontSize: 11, color: 'rgba(155,140,255,0.5)' }}>· {release.version}</span>}
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, marginBottom: 24 }}>
              Drop your email below — we'll notify you when updates ship. No spam, ever.
            </p>
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <input type="email" placeholder="you@example.com" value={email} autoFocus
                  onChange={e => setEmail(e.target.value)} onBlur={() => setTouched(true)}
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${invalid ? '#f87171' : 'rgba(255,255,255,0.1)'}`, color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { if (!invalid) e.currentTarget.style.borderColor = 'rgba(107,124,230,0.55)'; }}
                  onBlurCapture={e => { if (!invalid) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
                {invalid && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6, marginBottom: 0 }}>Please enter a valid email address.</p>}
              </div>
              <button type="submit" disabled={status === 'submitting'}
                style={{ padding: 13, borderRadius: 10, background: 'linear-gradient(135deg,#6b7ce6,#9b8cff)', border: 'none', color: 'white', fontWeight: 600, fontSize: 15, cursor: status === 'submitting' ? 'not-allowed' : 'pointer', opacity: status === 'submitting' ? 0.7 : 1, letterSpacing: '-0.01em' }}>
                {status === 'submitting' ? 'Preparing…' : 'Download Free →'}
              </button>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0, marginTop: 4 }}>Free forever · MIT License · No account needed</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Download buttons row
// ─────────────────────────────────────────────
function DownloadButtons({ release, onPlatform }: { release: ReleaseAssets | null; onPlatform: (p: Platform) => void }) {
  const os = detectOS();
  const btnStyle = (primary: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: primary ? '13px 28px' : '11px 22px',
    borderRadius: 12, border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
    background: primary ? 'linear-gradient(135deg,#6b7ce6,#9b8cff)' : 'rgba(255,255,255,0.04)',
    color: 'white', fontWeight: 600, fontSize: primary ? 15 : 14, cursor: 'pointer', letterSpacing: '-0.01em',
    transition: 'all .15s',
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      <button style={btnStyle(os === 'mac')} onClick={() => onPlatform('mac_arm')}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
        🍎 Mac — Apple Silicon
      </button>
      <button style={btnStyle(false)} onClick={() => onPlatform('mac_x64')}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(107,124,230,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
        🍎 Mac — Intel
      </button>
      <button style={btnStyle(os === 'win')} onClick={() => onPlatform('win')}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
        🪟 Windows
      </button>
      {release?.version && (
        <a href={`${GITHUB_URL}/releases/latest`} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none', cursor: 'pointer', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
          All releases ↗
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Screenshot mock frames (replace src with real screenshots when ready)
// ─────────────────────────────────────────────
const SCREENS = [
  {
    title: 'Dashboard',
    desc: 'Daily overview of habits, journal mood, spending, and upcoming subscriptions.',
    // Replace the content below with: <img src="/screenshots/dashboard.png" alt="Dashboard" style={{width:'100%',borderRadius:8}} />
    mockup: (
      <div style={{ background: '#0e0e17', borderRadius: 10, padding: '16px', minHeight: 200 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['Habits', 'Journal', 'Finance', 'Subs'].map(l => (
            <div key={l} style={{ flex: 1, borderRadius: 8, padding: '10px 8px', background: 'rgba(107,124,230,0.1)', border: '1px solid rgba(107,124,230,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 18, color: '#9b8cff', fontWeight: 700 }}>{['4/5', '✓', '₹12k', '3'][['Habits','Journal','Finance','Subs'].indexOf(l)]}</div>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 8, padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>TODAY'S HABITS</div>
          {['Morning run ✓', 'Reading ✓', 'Meditation', 'Cold shower'].map((h, i) => (
            <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: h.includes('✓') ? '#9b8cff' : 'rgba(255,255,255,0.08)', border: h.includes('✓') ? 'none' : '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: h.includes('✓') ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)' }}>{h.replace(' ✓', '')}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Journal',
    desc: 'A calm writing space with daily prompts, mood tracking, and AI-generated reflections.',
    mockup: (
      <div style={{ background: '#0e0e17', borderRadius: 10, padding: 16, minHeight: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Mon, 19 May</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['😊','😐','😔'].map((m, i) => <span key={m} style={{ fontSize: 16, opacity: i === 0 ? 1 : 0.3, cursor: 'pointer' }}>{m}</span>)}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
            Today was productive. Finished the notification system and ran a full code review. Feeling clear-headed and focused…
          </p>
        </div>
        <div style={{ borderRadius: 8, padding: 12, background: 'rgba(107,124,230,0.07)', border: '1px solid rgba(107,124,230,0.18)' }}>
          <div style={{ fontSize: 10, color: '#9b8cff', marginBottom: 4 }}>✦ AI REFLECTION</div>
          <p style={{ fontSize: 11, color: 'rgba(155,140,255,0.7)', lineHeight: 1.6, margin: 0 }}>You've mentioned clarity and focus 4 times this week. Your mood correlates with coding progress.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Finance',
    desc: 'Track income and expenses, set budgets, import bank statements, and get AI insights.',
    mockup: (
      <div style={{ background: '#0e0e17', borderRadius: 10, padding: 16, minHeight: 200 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['Income', '+₹85,000', '#4ade80'], ['Expense', '-₹42,300', '#f87171'], ['Net', '+₹42,700', '#9b8cff']].map(([l,v,c]) => (
            <div key={l as string} style={{ flex: 1, borderRadius: 8, padding: '10px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{l as string}</div>
              <div style={{ fontSize: 13, color: c as string, fontWeight: 700, fontFamily: 'monospace' }}>{v as string}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>BY CATEGORY</div>
          {[['Food & Dining', 68, '#9b8cff'], ['Transport', 42, '#6b7ce6'], ['Entertainment', 25, '#c084fc']].map(([cat, pct, col]) => (
            <div key={cat as string} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{cat as string}</span>
                <span style={{ fontSize: 10, color: col as string }}>{pct as number}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', borderRadius: 99, background: col as string, width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Habits',
    desc: 'Build streaks, track consistency, and visualize your progress over time.',
    mockup: (
      <div style={{ background: '#0e0e17', borderRadius: 10, padding: 16, minHeight: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>This week</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: i < 5 ? 'rgba(107,124,230,0.35)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: i < 5 ? '#9b8cff' : 'rgba(255,255,255,0.25)' }}>{d}</div>
            ))}
          </div>
        </div>
        {[['🏃 Morning run', 18, true], ['📚 Reading', 9, true], ['🧘 Meditation', 24, false], ['🚿 Cold shower', 6, true]].map(([h, streak, done]) => (
          <div key={h as string} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'linear-gradient(135deg,#6b7ce6,#9b8cff)' : 'rgba(255,255,255,0.08)', border: done ? 'none' : '1px solid rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white' }}>{done ? '✓' : ''}</div>
            <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{(h as string).split(' ').slice(1).join(' ')}</span>
            <span style={{ fontSize: 10, color: '#9b8cff', fontFamily: 'monospace' }}>🔥 {streak as number}d</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Subscriptions',
    desc: 'Never miss a renewal. Track all your subscriptions and see 12-month billing forecasts.',
    mockup: (
      <div style={{ background: '#0e0e17', borderRadius: 10, padding: 16, minHeight: 200 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, borderRadius: 8, padding: '10px 8px', background: 'rgba(107,124,230,0.1)', border: '1px solid rgba(107,124,230,0.2)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>MONTHLY</div>
            <div style={{ fontSize: 15, color: '#9b8cff', fontWeight: 700 }}>₹3,240</div>
          </div>
          <div style={{ flex: 1, borderRadius: 8, padding: '10px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>ACTIVE</div>
            <div style={{ fontSize: 15, color: 'white', fontWeight: 700 }}>8</div>
          </div>
          <div style={{ flex: 1, borderRadius: 8, padding: '10px 8px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>DUE SOON</div>
            <div style={{ fontSize: 15, color: '#f87171', fontWeight: 700 }}>2</div>
          </div>
        </div>
        {[['🎵 Spotify', '₹119', '2d'], ['☁️ iCloud', '₹75', '5d'], ['📺 Netflix', '₹499', '12d']].map(([s, amt, due]) => (
          <div key={s as string} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 14 }}>{(s as string).split(' ')[0]}</span>
            <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{(s as string).split(' ').slice(1).join(' ')}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>in {due as string}</span>
            <span style={{ fontSize: 12, color: '#9b8cff', fontWeight: 600 }}>{amt as string}</span>
          </div>
        ))}
      </div>
    ),
  },
];

// ─────────────────────────────────────────────
// What's New data
// ─────────────────────────────────────────────
const CHANGELOG = [
  {
    version: 'v1.0.20', date: 'May 2025', badge: 'Latest',
    changes: [
      'Added habit reminder time picker — set your own reminder time',
      'Fixed notification icons for morning briefings & budget warnings',
      "Budget warning now correctly opt-in (won't fire without consent)",
      'Import transactions now respects your profile currency setting',
      '50 MB file size guard on bank statement imports',
    ],
  },
  {
    version: 'v1.0.19', date: 'May 2025', badge: null,
    changes: [
      'Danger Zone in Settings — wipe all data with 3-step confirmation',
      'Fixed notification time showing wrong timezone ("5h ago" → "just now")',
      'OS notification sound no longer double-plays alongside in-app audio',
      'Existing unread notifications no longer re-fire as new push notifications',
    ],
  },
  {
    version: 'v1.0.18', date: 'Apr 2025', badge: null,
    changes: [
      'Full notification system — morning briefings, habit reminders, subscription alerts, budget warnings',
      'Configurable quiet hours to silence notifications at night',
      'Notification bell with unread badge + sound',
      'Per-notification sound toggle in Settings',
    ],
  },
  {
    version: 'v1.0.0 → v1.0.17', date: 'Feb–Apr 2025', badge: null,
    changes: [
      'Core modules: Journal, Habits, Finance, Subscriptions, AI Chat',
      'Bank statement import: CSV, Excel, PDF with AI auto-categorization',
      'Module system — enable/disable sections from Settings',
      'Desktop app packaging (Mac .dmg + Windows .exe) with auto-updater',
      'License system for controlled distribution',
    ],
  },
];

// ─────────────────────────────────────────────
// Features
// ─────────────────────────────────────────────
const FEATURES = [
  { icon: '📓', title: 'Daily Journal', desc: 'Rich journaling with mood tracking, AI summaries, and semantic search across your past entries.' },
  { icon: '🔥', title: 'Habit Tracking', desc: 'Build streaks, track consistency, get reminded at your chosen time. Schedule-aware so weekly habits don\'t penalise rest days.' },
  { icon: '💳', title: 'Financial Tracking', desc: 'Log income and expenses, set category budgets, import bank statements (CSV / Excel / PDF), and get AI category insights.' },
  { icon: '🔄', title: 'Subscription Manager', desc: 'Track every recurring charge, get renewal alerts up to 7 days ahead, and see a 12-month billing forecast.' },
  { icon: '🔔', title: 'Smart Notifications', desc: 'Morning briefing, habit reminders, subscription alerts, and budget warnings — all configurable with quiet hours.' },
  { icon: '🤖', title: 'AI that knows your life', desc: 'Ask about your spending patterns, journal entries, habit history, or get a unified life reflection. Fully local or cloud AI.' },
];

const PROVIDERS = [
  { name: 'LM Studio', label: 'Local · Free' }, { name: 'Ollama', label: 'Local · Free' },
  { name: 'OpenAI', label: 'GPT-4o' }, { name: 'Anthropic', label: 'Claude' },
  { name: 'Gemini', label: 'Google' }, { name: 'Groq', label: 'Fast inference' },
  { name: 'Mistral', label: 'Open weights' }, { name: 'Custom', label: 'Any OpenAI-compat' },
];

const INSTALL_STEPS = {
  mac: {
    prereqs: [
      { name: 'Python 3.11+', url: 'https://python.org/downloads', hint: 'or: brew install python@3.12' },
      { name: 'Node.js 18+', url: 'https://nodejs.org', hint: 'or: brew install node' },
    ],
    steps: [
      { label: 'Clone the repo', cmd: 'git clone https://github.com/Jeevanrajss/North-OS.git && cd North-OS' },
      { label: 'Install & launch', cmd: 'bash setup.sh' },
    ],
    note: 'Opens automatically at http://localhost:5173',
  },
  win: {
    prereqs: [
      { name: 'Python 3.11+', url: 'https://python.org/downloads', hint: 'Check "Add Python to PATH"' },
      { name: 'Node.js 18+', url: 'https://nodejs.org', hint: 'Download the LTS version' },
    ],
    steps: [
      { label: 'Clone the repo', cmd: 'git clone https://github.com/Jeevanrajss/North-OS.git && cd North-OS' },
      { label: 'Install & launch', cmd: 'setup.bat' },
    ],
    note: 'Windows may show "Unknown Publisher" — click Run. Opens at http://localhost:5173.',
  },
};

// ─────────────────────────────────────────────
// Main Landing component
// ─────────────────────────────────────────────
export function Landing() {
  const { release, loading } = useLatestRelease();
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  const [osTab, setOsTab] = useState<'mac' | 'win'>('mac');

  const install = INSTALL_STEPS[osTab];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
      className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* Download modal */}
      {activePlatform && release && (
        <DownloadModal platform={activePlatform} release={release} onClose={() => setActivePlatform(null)} />
      )}

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: 'radial-gradient(ellipse at center,rgba(107,124,230,0.12) 0%,transparent 70%)' }} />
      </div>

      {/* ════ NAV ════ */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', backgroundColor: 'rgba(10,10,15,0.85)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/favicon.png" alt="North OS" style={{ width: 30, height: 30, borderRadius: 8 }} />
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>North OS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {([['#features','Features'],['#screenshots','Screenshots'],['#whats-new',"What's New"],['#install','Install']] as [string,string][]).map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
                {label}
              </a>
            ))}
            <Link to="/tutorials" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
              Tutorials
            </Link>
            <button onClick={() => setActivePlatform(detectOS() === 'win' ? 'win' : 'mac_arm')}
              style={{ padding: '7px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#6b7ce6,#9b8cff)', border: 'none', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', letterSpacing: '-0.01em' }}>
              Download
            </button>
          </div>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '160px 24px 90px', textAlign: 'center' }}>
        {/* Live version badge */}
        <div style={{ display: 'inline-flex', marginBottom: 28 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, border: '1px solid rgba(107,124,230,0.3)', background: 'rgba(107,124,230,0.08)', fontSize: 12, color: 'rgba(155,140,255,0.9)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6b7ce6', display: 'inline-block', boxShadow: '0 0 6px #6b7ce6' }} />
            {loading ? 'Loading…' : release?.version ? `${release.version} available` : 'Privacy-first · Local-first AI'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(44px,7vw,76px)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.03em', color: 'white', marginBottom: 14 }}>
          Your personal life,<br />
          <span style={{ background: 'linear-gradient(135deg,#6b7ce6 0%,#9b8cff 50%,#c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            organized and understood.
          </span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(255,255,255,0.45)', maxWidth: 520, margin: '0 auto 48px', letterSpacing: '-0.01em' }}>
          A private, AI-powered desktop app for journaling, habits, finances, and subscriptions. Runs 100% on your machine.
        </p>

        <DownloadButtons release={release} onPlatform={setActivePlatform} />

        <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Free forever · MIT License · No account required
        </p>
      </section>

      {/* ════ SCREENSHOTS ════ */}
      <section id="screenshots" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#6b7ce6', textTransform: 'uppercase', marginBottom: 12 }}>See it in action</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
            Every corner of your life, in one place.
          </h2>
        </div>

        {/* Screenshot grid — replace `mockup` with <img src="/screenshots/screen-name.png" /> */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
          {SCREENS.map((s) => (
            <div key={s.title} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: '#0d0d14', transition: 'border-color .2s, transform .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(107,124,230,0.35)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
              {/* Window chrome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {['#f87171','#fbbf24','#4ade80'].map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.6 }} />)}
                <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>North OS — {s.title}</span>
              </div>
              {/* Screenshot / mockup area */}
              <div style={{ padding: 12 }}>{s.mockup}</div>
              {/* Label */}
              <div style={{ padding: '12px 16px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Mockup previews · Real screenshots will be added shortly
        </p>
      </section>

      {/* ════ FEATURES ════ */}
      <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#6b7ce6', textTransform: 'uppercase', marginBottom: 12 }}>What it does</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
            Everything that matters. Nothing that doesn't.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ padding: '28px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', transition: 'border-color .2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(107,124,230,0.25)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'}>
              <div style={{ width: 38, height: 38, borderRadius: 9, marginBottom: 16, background: 'rgba(107,124,230,0.12)', border: '1px solid rgba(107,124,230,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 8, letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════ WHAT'S NEW ════ */}
      <section id="whats-new" style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#6b7ce6', textTransform: 'uppercase', marginBottom: 12 }}>Changelog</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
            What's new
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>{entry.version}</span>
                {entry.badge && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(107,124,230,0.2)', border: '1px solid rgba(107,124,230,0.35)', color: '#9b8cff', fontWeight: 600 }}>{entry.badge}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{entry.date}</span>
              </div>
              <ul style={{ margin: 0, padding: '14px 20px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entry.changes.map((c) => (
                  <li key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    <span style={{ color: '#6b7ce6', marginTop: 1, flexShrink: 0 }}>✓</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ════ PRIVACY ════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ borderRadius: 20, padding: '60px 64px', border: '1px solid rgba(107,124,230,0.2)', background: 'linear-gradient(135deg,rgba(107,124,230,0.06) 0%,rgba(10,10,15,0) 60%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, background: 'radial-gradient(circle,rgba(107,124,230,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 520 }}>
            <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#6b7ce6', textTransform: 'uppercase', marginBottom: 16 }}>Privacy First</p>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 18, color: 'white' }}>
              Your data belongs to you.<br />Full stop.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
              North OS runs locally on your device. Your thoughts, emotions, routines, and finances never leave your machine. No tracking. No telemetry. No cloud unless you choose it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Runs entirely on your machine', 'No accounts, no sign-up required', 'Zero telemetry or analytics', 'Open source — inspect every line', 'Wipe all data with one click anytime'].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ color: '#6b7ce6', fontSize: 16 }}>✓</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ INSTALL (from source) ════ */}
      <section id="install" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#6b7ce6', textTransform: 'uppercase', marginBottom: 12 }}>Install from source</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'white', marginBottom: 10 }}>Prefer to run it yourself?</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 440, margin: '0 auto' }}>
            Clone the repo and run the setup script. One command installs everything.
          </p>
        </div>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {(['mac', 'win'] as const).map(tab => (
              <button key={tab} onClick={() => setOsTab(tab)}
                style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: osTab === tab ? '1px solid rgba(107,124,230,0.5)' : '1px solid rgba(255,255,255,0.08)', background: osTab === tab ? 'rgba(107,124,230,0.15)' : 'rgba(255,255,255,0.03)', color: osTab === tab ? '#9b8cff' : 'rgba(255,255,255,0.45)', transition: 'all .15s' }}>
                {tab === 'mac' ? '🍎 macOS / Linux' : '🪟 Windows'}
              </button>
            ))}
          </div>
          {install.prereqs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Prerequisites</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {install.prereqs.map((p) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: '#9b8cff', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>{p.name} ↗</a>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{p.hint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {install.steps.map((step, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Step {i + 1} — {step.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 10, background: '#0d0d14', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ color: 'rgba(107,124,230,0.5)', fontSize: 13, fontFamily: 'monospace', flexShrink: 0 }}>$</span>
                <code style={{ fontSize: 13, fontFamily: 'monospace', color: 'rgba(220,220,255,0.85)', flex: 1, wordBreak: 'break-all' }}>{step.cmd}</code>
                <CopyBtn text={step.cmd} />
              </div>
            </div>
          ))}
          <div style={{ padding: '13px 16px', borderRadius: 10, background: 'rgba(107,124,230,0.07)', border: '1px solid rgba(107,124,230,0.15)', marginTop: 8 }}>
            <p style={{ fontSize: 13, color: 'rgba(155,140,255,0.7)', lineHeight: 1.6, margin: 0 }}>✓ &nbsp;{install.note}</p>
          </div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/tutorials" style={{ fontSize: 13, color: '#9b8cff', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              Read the full setup guide & tutorials →
            </Link>
          </div>
        </div>
      </section>

      {/* ════ AI PROVIDERS ════ */}
      <section id="ai-providers" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#6b7ce6', textTransform: 'uppercase', marginBottom: 12 }}>AI providers</p>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'white', marginBottom: 10 }}>Your AI. Your choice.</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 440, margin: '0 auto' }}>Start with a free local model for full privacy, or use any cloud provider. Switch any time from Settings.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {PROVIDERS.map((p) => (
            <div key={p.name} style={{ padding: '10px 20px', borderRadius: 100, border: '1px solid rgba(107,124,230,0.25)', background: 'rgba(107,124,230,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{p.name}</span>
              <span style={{ fontSize: 11, color: 'rgba(107,124,230,0.5)' }}>·</span>
              <span style={{ fontSize: 11, color: 'rgba(155,140,255,0.55)' }}>{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════ FINAL CTA ════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 120px' }}>
        <div style={{ textAlign: 'center', padding: '80px 40px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse,rgba(107,124,230,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <p style={{ fontSize: 12, letterSpacing: '0.12em', color: '#6b7ce6', textTransform: 'uppercase', marginBottom: 20 }}>Get started</p>
          <h2 style={{ fontSize: 'clamp(30px,5vw,52px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'white', marginBottom: 18 }}>
            Start understanding yourself.
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.4)', maxWidth: 400, margin: '0 auto 40px', lineHeight: 1.65 }}>
            Free, open source, and runs entirely on your machine.
          </p>
          <DownloadButtons release={release} onPlatform={setActivePlatform} />
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/favicon.png" alt="North OS" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>North OS</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>MIT License</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {([['#features','Features'],['#screenshots','Screenshots'],['#whats-new',"What's New"],['#install','Install from source']] as [string,string][]).map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
              {label}
            </a>
          ))}
          <Link to="/tutorials" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
            Tutorials
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
