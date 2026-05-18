import { useState } from 'react';
import type { Entry } from '@/lib/api';
import { EntryEditor } from './EntryEditor';
import { Trash2 } from 'lucide-react';
import { formatLocalTime } from '@/lib/date';

type Props = {
  entries: Entry[];
  composing?: boolean;
  onSetComposing?: (v: boolean) => void;
  onCreate: (content_json: string, content_text: string) => Promise<void>;
  onUpdate: (entryId: string, content_json: string, content_text: string) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
};

function formatTime(iso: string): string {
  return formatLocalTime(iso, 'h:mm a');
}

export function EntryList({ entries, composing: composingProp, onSetComposing, onCreate, onUpdate, onDelete }: Props) {
  const [composingLocal, setComposingLocal] = useState(false);
  const composing = composingProp ?? composingLocal;
  const setComposing = onSetComposing ?? setComposingLocal;

  async function handleCreate(json: string, text: string) {
    await onCreate(json, text);
    setComposing(false);
  }

  return (
    <div className="space-y-4">
      {entries.map((e) => (
        <div key={e.id} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span className="font-mono">{formatTime(e.created_at)}</span>
            <button
              type="button"
              onClick={() => {
                if (confirm('Delete this entry?')) void onDelete(e.id);
              }}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-ink-500 hover:text-red-400 hover:bg-red-950/30"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
          <EntryEditor
            entry={e}
            onSave={(json, text) => onUpdate(e.id, json, text)}
          />
        </div>
      ))}

      {composing && (
        <div className="space-y-2">
          <div className="text-xs text-ink-500">New entry</div>
          <EntryEditor autoFocus onSave={handleCreate} />
          <button
            type="button"
            onClick={() => setComposing(false)}
            className="text-xs text-ink-500 hover:text-ink-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add entry trigger is in the parent card header */}
    </div>
  );
}
