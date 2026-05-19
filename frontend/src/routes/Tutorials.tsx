import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Section {
  id: string;
  icon: string;
  label: string;
  title: string;
  intro: string;
  steps: Step[];
  tips?: string[];
}

interface Step {
  heading: string;
  body: string | React.ReactNode;
  code?: string;
  note?: string;
}

// ─────────────────────────────────────────────
// Tutorial content
// ─────────────────────────────────────────────
const SECTIONS: Section[] = [
  {
    id: 'setup',
    icon: '⚡',
    label: 'Setup',
    title: 'Getting Started',
    intro: 'Install North OS and get running in under 5 minutes. The desktop app bundles everything — no Python or Node.js required.',
    steps: [
      {
        heading: '1. Download the app',
        body: 'Download the installer for your platform from the home page. Pick "Mac – Apple Silicon" for M1/M2/M3 Macs, "Mac – Intel" for older Intel Macs, or "Windows" for a PC.',
      },
      {
        heading: '2. Install it',
        body: (
          <span>
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>macOS:</strong> Open the <code style={{ background: 'rgba(107,124,230,0.15)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>.dmg</code>, drag North OS into Applications, then double-click to launch. If macOS says "unverified developer", go to <em>System Settings → Privacy & Security → Open Anyway</em>.<br /><br />
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Windows:</strong> Run the <code style={{ background: 'rgba(107,124,230,0.15)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>.exe</code> installer. Windows may show a SmartScreen prompt — click <em>More info → Run anyway</em>. This is normal for unsigned apps.
          </span>
        ),
      },
      {
        heading: '3. First launch',
        body: 'The app opens directly to your dashboard. Your data is stored locally at ~/Library/Application Support/PersonalOS/ (Mac) or %APPDATA%\\PersonalOS\\ (Windows). Nothing leaves your machine.',
      },
      {
        heading: '4. Install from source (optional)',
        body: 'If you prefer to run directly from code — no installer needed:',
        code: '# macOS / Linux\ngit clone https://github.com/Jeevanrajss/North-OS.git\ncd North-OS\nbash setup.sh\n\n# Windows\ngit clone https://github.com/Jeevanrajss/North-OS.git\ncd North-OS\nsetup.bat',
        note: 'Requires Python 3.11+ and Node.js 18+. The setup script installs everything and opens the app automatically.',
      },
      {
        heading: '5. Auto-updates',
        body: 'The desktop app checks for updates automatically on every launch. When a new version is available, a dialog appears — click "Restart to update" and it applies in seconds. You\'ll always be on the latest version without doing anything.',
      },
    ],
    tips: [
      'Your data is never wiped by an update — it lives in a separate folder from the app itself.',
      'You can run multiple versions side-by-side if needed — each looks at the same data folder.',
      'Use Settings → Danger Zone if you ever want to start fresh.',
    ],
  },
  {
    id: 'ai',
    icon: '🤖',
    label: 'AI Setup',
    title: 'Configuring AI',
    intro: 'North OS works with any AI provider — local models (free, private) or cloud APIs. Set it up once and every module benefits: journal summaries, financial insights, smart categorization, and the chat assistant.',
    steps: [
      {
        heading: '1. Open Settings → AI Provider',
        body: 'Click the gear icon in the sidebar, then select the "AI Provider" section. You\'ll see a dropdown of supported providers.',
      },
      {
        heading: '2. Choose your provider',
        body: (
          <div>
            <p style={{ margin: '0 0 10px' }}>Pick the option that fits your situation:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['🏠 LM Studio / Ollama', 'Best for privacy. Download a model locally, point North OS to http://localhost:1234 or http://localhost:11434. Completely free. Works offline.'],
                ['🤖 OpenAI', 'Fast and capable. Needs an API key from platform.openai.com. Costs a few cents per day of normal use.'],
                ['🔮 Anthropic (Claude)', 'High quality reasoning. API key from console.anthropic.com.'],
                ['💎 Gemini', 'Google\'s models. API key from aistudio.google.com — free tier available.'],
                ['⚡ Groq', 'Extremely fast inference for open models. Free tier available at console.groq.com.'],
              ].map(([name, desc]) => (
                <div key={name as string} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 3 }}>{name as string}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc as string}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        heading: '3. Enter your API key',
        body: 'Paste your API key in the field provided. It is stored only on your device — never sent anywhere except to the provider you chose. The key is masked after saving.',
      },
      {
        heading: '4. Select models',
        body: 'After entering your API key, click "Load Models" to fetch available models. Select a Chat model (used for AI Chat, journal summaries, insights) and optionally a Fast model (used for quick tasks like transaction categorization).',
      },
      {
        heading: '5. Test the connection',
        body: 'Hit "Test connection" — the app sends a small ping to your provider. You should see "Connected" within a few seconds. If it fails, double-check your API key and that the base URL matches your provider.',
        note: 'For LM Studio / Ollama: make sure the local server is running before testing.',
      },
    ],
    tips: [
      'You can switch providers any time — all modules immediately use the new one.',
      'AI features degrade gracefully: if no provider is configured, modules still work — AI features just show a "no AI configured" state.',
      'Local models are best for the journal (sensitive data). Cloud models are faster for financial insights.',
    ],
  },
  {
    id: 'journal',
    icon: '📓',
    label: 'Journal',
    title: 'Daily Journal',
    intro: 'The journal is your private writing space. Write freely, track your mood, and let AI surface patterns across weeks and months of entries.',
    steps: [
      {
        heading: 'Writing an entry',
        body: 'Click "Journal" in the sidebar. The editor opens to today\'s date. Just start typing — entries auto-save every few seconds. You can write as much or as little as you like.',
      },
      {
        heading: 'Setting your mood',
        body: 'At the top of the editor there are five mood icons (😊 😌 😐 😔 😢). Click the one that best represents how you feel today. Your mood is tracked over time and shown in the Dashboard mood chart.',
      },
      {
        heading: 'Adding tags',
        body: 'Type a # followed by a word to create a tag (e.g. #grateful, #work, #anxious). Tags let you filter and search entries later. You can create any tag — a few seeded ones are pre-loaded but you can use anything.',
      },
      {
        heading: 'AI summary',
        body: 'After writing, click "Summarise" (the ✦ button in the toolbar). The AI reads your entry and produces a concise reflection. The summary is saved alongside your entry and shown in the Dashboard morning briefing.',
        note: 'AI summarisation requires a configured AI provider.',
      },
      {
        heading: 'Browsing past entries',
        body: 'Use the calendar in the sidebar to jump to any past date. Dates with entries are highlighted. You can also use the search bar to find entries by keyword or tag.',
      },
      {
        heading: 'Semantic search',
        body: 'The search bar does more than keyword matching — it understands meaning. Try "times I felt overwhelmed" or "entries about my morning routine". Results are ranked by relevance, not just exact match.',
        note: 'Semantic search requires an embedding model. This works with most local and cloud providers.',
      },
    ],
    tips: [
      'Journal entries are plain text with Markdown support — use **bold**, *italic*, and - bullet lists.',
      'The AI never reads your entries unless you explicitly click Summarise or ask the AI Chat about them.',
      'Use the mood chart in Dashboard to spot emotional patterns across weeks.',
    ],
  },
  {
    id: 'habits',
    icon: '🔥',
    label: 'Habits',
    title: 'Habit Tracker',
    intro: 'Build and maintain positive habits with streaks, completion heatmaps, and schedule-aware tracking. Weekly habits only count on days they\'re scheduled — no false misses.',
    steps: [
      {
        heading: 'Creating a habit',
        body: 'Go to Habits → click "New Habit". Give it a name, an emoji, and choose a frequency: Daily (every day) or Weekly (specific days of the week). Weekly habits let you pick exactly which days — e.g. Mon/Wed/Fri for a gym habit.',
      },
      {
        heading: 'Checking in',
        body: 'On the main Habits page, each habit shows a circle. Click it to mark today as done — it turns purple with a ✓. Click again to undo. You can also check in on past dates by opening the habit detail page.',
      },
      {
        heading: 'Streaks',
        body: 'Your streak is the number of consecutive scheduled days completed. For weekly habits, unscheduled days are skipped — a Tue/Fri habit maintains its streak through Wednesday even if you don\'t log anything.',
      },
      {
        heading: 'Habit detail page',
        body: 'Click any habit name to open its detail page. You\'ll see: a heatmap of all completions, a day-of-week breakdown (which day you succeed most), a 12-month trend, and recent notes.',
      },
      {
        heading: 'Adding notes to a check-in',
        body: 'On the detail page, click a date in the heatmap. A small form lets you add a note to that check-in (e.g. "Ran 5km", "30 minutes today"). These appear in your habit history.',
      },
      {
        heading: 'Archiving habits',
        body: 'If you want to pause or retire a habit, open it and click "Archive". All historical data is preserved — you can restore it anytime from the archived habits list.',
      },
    ],
    tips: [
      'Reorder habits by dragging them — the order persists across sessions.',
      'The Dashboard shows today\'s habit completion status at a glance.',
      'Habit reminders fire at your configured time (default 9 PM) if any habits are still unchecked.',
    ],
  },
  {
    id: 'finance',
    icon: '💳',
    label: 'Finance',
    title: 'Finance Tracker',
    intro: 'Track income and expenses, set monthly budgets, import bank statements automatically, and get AI insights on your spending patterns.',
    steps: [
      {
        heading: 'Adding a transaction manually',
        body: 'Go to Finance → click the "+" button. Fill in: type (Income or Expense), amount, category, date, account, and an optional note. Click Save — it appears immediately in the list and monthly summary.',
      },
      {
        heading: 'Importing a bank statement',
        body: 'Click "Import" in the Finance header. Upload your bank statement — CSV, Excel (.xlsx/.xls), or PDF are all supported. North OS auto-detects most Indian bank formats. If your bank isn\'t recognised, use the column mapper to tell it which column is date/amount/description.',
        note: 'AI automatically categorizes every imported transaction. You can review and change categories before confirming.',
      },
      {
        heading: 'Reviewing and confirming imports',
        body: 'After upload, a preview table shows every transaction with a suggested category. Uncheck any rows you don\'t want to import (duplicates are flagged automatically). Click "Confirm Import" to save.',
      },
      {
        heading: 'Setting a budget',
        body: 'Click "Budgets" in the Finance header. Add a budget for any category (e.g. Food & Dining: ₹8,000/month). You can set recurring budgets that apply every month, or one-off budgets for a specific month.',
      },
      {
        heading: 'Monthly summary',
        body: 'The Finance page shows a monthly summary: total income, total expenses, net savings, and a category breakdown bar chart. Use the month picker to view any past month.',
      },
      {
        heading: 'Exporting a report',
        body: 'Click "Export" on any month to download a full report as CSV or PDF. The PDF includes a summary page, category breakdown, and full transaction list.',
      },
      {
        heading: 'AI insights',
        body: 'Click "AI Insights" (the ✦ button). The AI compares this month vs last month and surfaces 3–4 observations — categories that increased, savings rate changes, anything worth acting on.',
        note: 'Requires a configured AI provider.',
      },
    ],
    tips: [
      'Finance categories are fully customizable — add, rename, or remove categories in Settings → Finance Categories.',
      'Budget warnings notify you when any category crosses 80% — enable this in Settings → Notifications.',
      'The default currency is INR. Change it in Settings → Profile to match your local currency.',
    ],
  },
  {
    id: 'subscriptions',
    icon: '🔄',
    label: 'Subscriptions',
    title: 'Subscription Manager',
    intro: 'Keep track of every recurring charge. North OS tells you what\'s renewing soon, how much you\'re spending monthly, and shows a 12-month billing forecast.',
    steps: [
      {
        heading: 'Adding a subscription',
        body: 'Go to Subscriptions → click "Add". Fill in: name, emoji, amount, billing cycle (monthly / quarterly / yearly / weekly), and the next billing date. The app calculates all future renewal dates automatically.',
      },
      {
        heading: 'Renewal alerts',
        body: 'When a subscription is 1–7 days away (configurable in Settings → Notifications), you get an in-app notification. Set the alert window to 3 days for a manageable heads-up.',
      },
      {
        heading: 'Billing forecast',
        body: 'The Forecast tab shows a month-by-month breakdown of all billing charges for the next 12 months. Useful for spotting expensive months in advance.',
      },
      {
        heading: 'Pausing a subscription',
        body: 'If you\'ve temporarily paused a service, click the subscription → "Pause". It won\'t appear in renewal alerts or monthly totals while paused. Unpause when your service resumes.',
      },
      {
        heading: 'Cancelling a subscription',
        body: 'Click a subscription → "Cancel". It\'s soft-deleted — it disappears from active lists but history is preserved. You can restore it with "Restore" if you resubscribe later.',
      },
    ],
    tips: [
      'Use the "upcoming renewals" widget on the Dashboard to see what\'s due this week at a glance.',
      'Monthly total shown in the header is your true ongoing monthly cost, normalized across quarterly and yearly plans.',
      'The forecast uses calendar-month math — a Feb 28 subscription correctly lands on Mar 31 the next month.',
    ],
  },
  {
    id: 'notifications',
    icon: '🔔',
    label: 'Notifications',
    title: 'Notifications',
    intro: 'North OS has a built-in notification system — morning briefings, habit reminders, subscription alerts, and budget warnings. Everything is configurable with quiet hours.',
    steps: [
      {
        heading: 'Opening notification settings',
        body: 'Go to Settings → Notifications. Each notification type has an on/off toggle. Morning briefing and habit reminders also have a time picker.',
      },
      {
        heading: 'Morning briefing',
        body: 'Fires once per day at your chosen time (default 8:30 AM). Summarizes: habits done vs due today, subscriptions renewing today, and a friendly "have a great day" if nothing is pending.',
      },
      {
        heading: 'Habit reminders',
        body: 'Fires once per day at your chosen time (default 9:00 PM) if any habits are still unchecked. Lists which habits are pending.',
      },
      {
        heading: 'Subscription alerts',
        body: 'Fires each morning for any subscription renewing within your configured window (1–7 days). One alert per subscription per day.',
      },
      {
        heading: 'Budget warnings',
        body: 'Opt-in (off by default). When any expense category crosses 80% of its monthly budget, you get one warning per category per month.',
      },
      {
        heading: 'Quiet hours',
        body: 'Set a start and end time (e.g. 10 PM → 7 AM). No notifications fire during this window. The morning briefing bypasses quiet hours since it\'s intentional.',
      },
      {
        heading: 'Desktop (OS-level) notifications',
        body: 'The first time you open the notifications panel, North OS requests permission for OS-level popups. Grant it to receive notifications even when the app is in the background.',
        note: 'If you accidentally denied permission, go to System Settings → Notifications → North OS (Mac) or Windows Settings → Notifications to re-enable.',
      },
      {
        heading: 'Notification sound',
        body: 'Toggle the "Notification sound" switch in Settings → Notifications. This is a per-device setting — it won\'t sync across machines.',
      },
      {
        heading: 'Testing notifications',
        body: 'At the bottom of the notification settings page, there are four "Test now" buttons — one per type. Click one to fire a test notification immediately, regardless of your schedule or quiet hours.',
      },
    ],
    tips: [
      'Notifications are generated by a background scheduler inside the app. They fire even if the browser tab is hidden, as long as the app is running.',
      'You can view all past notifications in the notification bell (top right corner). Unread notifications are highlighted.',
      'Use "Mark all as read" to clear the badge counter, or "Clear read" to remove old notifications from the list.',
    ],
  },
  {
    id: 'ai-chat',
    icon: '💬',
    label: 'AI Chat',
    title: 'AI Chat',
    intro: 'A conversational AI assistant that has full context of your journal, habits, finances, and subscriptions. Ask anything about your own data.',
    steps: [
      {
        heading: 'Opening AI Chat',
        body: 'Click "Chat" in the sidebar, or use the floating chat button in the bottom-right corner of any page.',
      },
      {
        heading: 'What you can ask',
        body: (
          <div>
            <p style={{ margin: '0 0 12px' }}>The AI has read access to all your data. Good questions include:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'How much did I spend on food this month compared to last?',
                'What are my most consistent habits over the last 30 days?',
                'Summarise my journal entries from this week.',
                'Which subscriptions am I spending the most on?',
                'What patterns do you notice in my mood and habit data?',
                'Give me a weekly reflection based on everything.',
                'Am I on track with my budget this month?',
              ].map((q) => (
                <div key={q} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(107,124,230,0.07)', border: '1px solid rgba(107,124,230,0.15)', fontSize: 12, color: 'rgba(155,140,255,0.8)' }}>
                  <span style={{ color: '#6b7ce6', flexShrink: 0 }}>→</span>{q}
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        heading: 'Switching modes',
        body: 'The Chat page has two modes at the top: "Chat" (conversation) and "Insights" (pre-built reports). Insights gives you structured summaries of your data without needing to ask.',
      },
      {
        heading: 'Conversation history',
        body: 'Chat history is stored locally and persists across sessions. Use the "Clear conversation" button to start fresh.',
      },
    ],
    tips: [
      'Be specific for better answers: "spending on Food in April" is better than "my food spending".',
      'The AI reads data up to the current moment — it knows about transactions you added today.',
      'If AI Chat isn\'t showing in the sidebar, check Settings → Modules to make sure it\'s enabled.',
    ],
  },
  {
    id: 'data',
    icon: '🗄️',
    label: 'Data & Privacy',
    title: 'Data Management',
    intro: 'Your data is stored locally in a SQLite database. You have full control — export reports, wipe everything, or inspect the database file directly.',
    steps: [
      {
        heading: 'Where your data lives',
        body: (
          <div>
            <p style={{ margin: '0 0 10px' }}>Your database is at:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['macOS', '~/Library/Application Support/PersonalOS/north-os.db'],
                ['Windows', '%APPDATA%\\PersonalOS\\north-os.db'],
                ['Dev / source install', 'data/north-os.db (inside the repo folder)'],
              ].map(([os, path]) => (
                <div key={os as string} style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{os as string}</div>
                  <code style={{ fontSize: 12, color: 'rgba(155,140,255,0.75)', wordBreak: 'break-all' }}>{path as string}</code>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        heading: 'Exporting finance reports',
        body: 'In Finance, click Export on any month. Choose CSV (for spreadsheets) or PDF (formatted report with charts and transaction list). Reports are generated locally — nothing is uploaded.',
      },
      {
        heading: 'Backing up your data',
        body: 'Copy the north-os.db file to a safe location (external drive, encrypted cloud storage). To restore, just replace the file and restart the app.',
        note: 'Tip: Set up a daily automated backup using rsync, Time Machine (Mac), or any backup tool that includes the Application Support folder.',
      },
      {
        heading: 'Wiping all data (Danger Zone)',
        body: 'Go to Settings → scroll to the very bottom → "Danger Zone". Click "Erase all my data". A 3-step confirmation walks you through what will be deleted and asks you to type "delete my data" before proceeding.',
        note: 'What is preserved: AI provider settings, notification preferences, module configuration, system finance categories. What is deleted: all transactions, habits, journal entries, subscriptions, budgets, and notifications.',
      },
      {
        heading: 'Deleting the app completely',
        body: (
          <span>
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>macOS:</strong> Move North OS.app from Applications to Trash. Then delete the data folder: <code style={{ background: 'rgba(107,124,230,0.15)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>~/Library/Application Support/PersonalOS/</code><br /><br />
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Windows:</strong> Use Add/Remove Programs to uninstall, then delete <code style={{ background: 'rgba(107,124,230,0.15)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>%APPDATA%\PersonalOS\</code>
          </span>
        ),
      },
    ],
    tips: [
      'The database is plain SQLite — you can open it with DB Browser for SQLite or any SQLite client to inspect your data directly.',
      'North OS never phones home. There are no analytics, no crash reports, no telemetry of any kind.',
      'If you use multiple machines, you can sync the .db file with any file sync tool (iCloud Drive, Dropbox, etc.) — just make sure only one instance runs at a time.',
    ],
  },
  {
    id: 'modules',
    icon: '🧩',
    label: 'Modules',
    title: 'Modules & Customization',
    intro: 'Enable only the parts of North OS you use. Each module can be toggled independently — unused ones are completely hidden from the sidebar.',
    steps: [
      {
        heading: 'Enabling / disabling modules',
        body: 'Go to Settings → Modules. Toggle any module on or off. Changes take effect immediately — the sidebar updates without a page refresh.',
      },
      {
        heading: 'Available modules',
        body: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['📓 Journal', 'Daily writing, mood tracking, AI summaries, semantic search'],
              ['🔥 Habits', 'Habit creation, check-ins, streaks, detail heatmaps'],
              ['💳 Finance', 'Transactions, budgets, import, reports, AI insights'],
              ['🔄 Subscriptions', 'Subscription tracking, renewal alerts, billing forecast'],
              ['💬 AI Chat', 'Conversational AI with full data context'],
            ].map(([name, desc]) => (
              <div key={name as string} style={{ padding: '12px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{(name as string).split(' ')[0]}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>{(name as string).split(' ').slice(1).join(' ')}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{desc as string}</div>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        heading: 'Custom finance categories',
        body: 'Go to Settings → Finance Categories to add, rename, or delete categories. You can set an emoji and whether a category is for expenses, income, or both.',
      },
      {
        heading: 'Profile currency',
        body: 'Go to Settings → Profile → Display currency. This sets the symbol shown throughout Finance and Subscriptions. Default is INR (₹).',
      },
      {
        heading: 'App lock (PIN / Biometric)',
        body: 'Go to Settings → Security. Set a PIN to lock the app on startup. On supported devices, you can use Face ID or Touch ID instead of a PIN.',
      },
    ],
    tips: [
      'Disabling a module hides it from the UI but preserves all its data — re-enable it to access everything again.',
      'The Dashboard adapts automatically — it only shows widgets for enabled modules.',
    ],
  },
];

// ─────────────────────────────────────────────
// Code block component
// ─────────────────────────────────────────────
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', margin: '12px 0', borderRadius: 10, background: '#0d0d14', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>bash</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: copied ? '#9b8cff' : 'rgba(255,255,255,0.35)', transition: 'all .15s' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px 16px', overflowX: 'auto' }}>
        <code style={{ fontSize: 12.5, fontFamily: '"Fira Code", "Cascadia Code", monospace', color: 'rgba(210,210,240,0.85)', lineHeight: 1.7, whiteSpace: 'pre' }}>{code}</code>
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Tutorials page
// ─────────────────────────────────────────────
export function Tutorials() {
  const [active, setActive] = useState<string>('setup');
  const contentRef = useRef<HTMLDivElement>(null);
  const section = SECTIONS.find((s) => s.id === active)!;

  // Sync active section with scroll position
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [active]);

  const sidebarW = 220;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', minHeight: '100vh', background: '#0a0a0f', color: 'white', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, height: 56, borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', background: 'rgba(10,10,15,0.9)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'white' }}>
          <img src="/favicon.png" alt="North OS" style={{ width: 26, height: 26, borderRadius: 7 }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>North OS</span>
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>/</span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Tutorials & How-to Guides</span>
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
            ← Back to home
          </Link>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 24px' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: sidebarW, flexShrink: 0, paddingTop: 36, paddingRight: 24, position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          <p style={{ fontSize: 10.5, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 }}>Guides</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: active === s.id ? 'rgba(107,124,230,0.15)' : 'transparent', border: active === s.id ? '1px solid rgba(107,124,230,0.3)' : '1px solid transparent', color: active === s.id ? '#9b8cff' : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: active === s.id ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all .15s', width: '100%' }}
                onMouseEnter={e => { if (active !== s.id) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
                onMouseLeave={e => { if (active !== s.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: 32, padding: '16px', borderRadius: 10, background: 'rgba(107,124,230,0.07)', border: '1px solid rgba(107,124,230,0.18)' }}>
            <p style={{ fontSize: 12, color: 'rgba(155,140,255,0.6)', lineHeight: 1.55, margin: '0 0 10px' }}>
              Not finding your answer?
            </p>
            <a href="https://github.com/Jeevanrajss/North-OS/issues" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#9b8cff', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              Open a GitHub issue →
            </a>
          </div>
        </aside>

        {/* ── Content ── */}
        <main ref={contentRef} style={{ flex: 1, paddingTop: 36, paddingLeft: 36, paddingBottom: 80, borderLeft: '1px solid rgba(255,255,255,0.06)', minWidth: 0 }}>

          {/* Section header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 100, background: 'rgba(107,124,230,0.1)', border: '1px solid rgba(107,124,230,0.2)', marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>{section.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9b8cff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{section.label}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,38px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'white', marginBottom: 12, lineHeight: 1.15 }}>
              {section.title}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 620, margin: 0 }}>
              {section.intro}
            </p>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 36 }} />

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {section.steps.map((step, i) => (
              <div key={i}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 10, letterSpacing: '-0.015em' }}>
                  {step.heading}
                </h3>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>
                  {step.body}
                </div>
                {step.code && <CodeBlock code={step.code} />}
                {step.note && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, padding: '11px 14px', borderRadius: 9, background: 'rgba(107,124,230,0.07)', border: '1px solid rgba(107,124,230,0.2)' }}>
                    <span style={{ color: '#9b8cff', flexShrink: 0, marginTop: 1 }}>💡</span>
                    <p style={{ fontSize: 13, color: 'rgba(155,140,255,0.7)', lineHeight: 1.6, margin: 0 }}>{step.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tips */}
          {section.tips && section.tips.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(107,124,230,0.8)', textTransform: 'uppercase', marginBottom: 16 }}>
                Tips & tricks
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.tips.map((tip) => (
                  <div key={tip} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ color: '#6b7ce6', flexShrink: 0, marginTop: 2 }}>✦</span>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: 0 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prev / Next navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 56, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', gap: 16, flexWrap: 'wrap' }}>
            {(() => {
              const idx = SECTIONS.findIndex((s) => s.id === active);
              const prev = SECTIONS[idx - 1];
              const next = SECTIONS[idx + 1];
              return (
                <>
                  {prev ? (
                    <button onClick={() => setActive(prev.id)}
                      style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(107,124,230,0.4)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>← Previous</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{prev.icon} {prev.title}</span>
                    </button>
                  ) : <div />}
                  {next ? (
                    <button onClick={() => setActive(next.id)}
                      style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 18px', borderRadius: 10, background: 'rgba(107,124,230,0.08)', border: '1px solid rgba(107,124,230,0.25)', cursor: 'pointer', textAlign: 'right', transition: 'border-color .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(107,124,230,0.5)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(107,124,230,0.25)'}>
                      <span style={{ fontSize: 11, color: 'rgba(155,140,255,0.5)' }}>Next →</span>
                      <span style={{ fontSize: 13, color: '#9b8cff', fontWeight: 500 }}>{next.icon} {next.title}</span>
                    </button>
                  ) : (
                    <Link to="/" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 18px', borderRadius: 10, background: 'rgba(107,124,230,0.08)', border: '1px solid rgba(107,124,230,0.25)', textDecoration: 'none', textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: 'rgba(155,140,255,0.5)' }}>Done reading →</span>
                      <span style={{ fontSize: 13, color: '#9b8cff', fontWeight: 500 }}>Back to home</span>
                    </Link>
                  )}
                </>
              );
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}
