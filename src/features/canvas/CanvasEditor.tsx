'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  useCollaborativeEditor,
  generateUserColor,
} from '@/features/notes/hooks/useCollaborativeEditor';
import { TableControls } from '@/components/tiptap/TableControls';
import { ImageControls } from '@/components/tiptap/ImageControls';
import { EditorStyles } from '@/features/notes/lib/editorStyles';
import { CollaborativeEditorStyles } from '@/features/notes/lib/collaborativeEditorStyles';
import { getDisplayName } from '@/features/user/identity';
import { VoiceEditButton } from './VoiceEditButton';
import { MeetBar } from './MeetBar';

interface CanvasEditorProps {
  /** Note id — the Hocuspocus document is `note:{noteId}`. */
  noteId: string;
  /** Display name for the presence cursor. */
  userName?: string;
  placeholder?: string;
}

/** Send arbitrary text to the AI endpoint and return the reply. */
async function askAI(payload: {
  prompt: string;
  context?: string;
}): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return (data?.text ?? '').trim();
}

/**
 * Floating "Summarize" button over a drag-selection. Select (drag) text in the
 * canvas → a button appears → it sends just the selected text to the AI and
 * inserts a one-to-two sentence summary as a blockquote right after the
 * selection. Everyone on the note sees it (it flows through the shared Y.Doc).
 */
function SelectionSummarize({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    function update() {
      if (loading) return;
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        setPos(null);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, '\n').trim();
      if (!text) {
        setPos(null);
        return;
      }
      rangeRef.current = { from, to };
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      setPos({
        top: Math.min(start.top, end.top) - 40,
        left: (start.left + end.left) / 2,
      });
    }
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor, loading]);

  async function summarize() {
    const range = rangeRef.current;
    if (!range || loading) return;
    const text = editor.state.doc.textBetween(range.from, range.to, '\n');
    setLoading(true);
    try {
      const summary = await askAI({
        prompt: `Summarize the following text in one or two concise sentences. Respond with just the summary, no preamble:\n\n${text}`,
      });
      if (summary) {
        editor
          .chain()
          .focus()
          .setTextSelection(range.to)
          .insertContent(`\n\n> ${summary}\n\n`, { contentType: 'markdown' })
          .run();
      }
    } catch (e) {
      editor
        .chain()
        .focus()
        .setTextSelection(range.to)
        .insertContent(
          `\n\n> _AI error: ${e instanceof Error ? e.message : 'failed'}_\n\n`,
          { contentType: 'markdown' }
        )
        .run();
    } finally {
      setLoading(false);
      setPos(null);
    }
  }

  if (!pos) return null;

  return (
    <button
      type='button'
      data-testid='summarize-selection'
      onMouseDown={e => e.preventDefault()}
      onClick={() => void summarize()}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
      className='z-40 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900'
    >
      {loading ? (
        <Loader2 className='size-3.5 animate-spin' />
      ) : (
        <Sparkles className='size-3.5' />
      )}
      Summarize
    </button>
  );
}

/**
 * Realtime collaborative canvas — the same TipTap + Y.js + Hocuspocus stack as
 * cogno's editor, stripped of auth / tasks / attachments. Everyone on the same
 * note edits one shared document live. Use the "/" slash menu to insert
 * headings, tables, mermaid diagrams, Excalidraw drawings, columns, etc.
 * Drag-select text and click "Summarize" to insert an AI summary.
 */
export function CanvasEditor({
  noteId,
  userName,
  placeholder = 'Type something…',
}: CanvasEditorProps) {
  // Presence identity: a per-browser display name (localStorage), for the
  // cursor label only. No auth — this doesn't gate anything.
  const userInfo = useMemo(() => {
    const { id, name } = getDisplayName();
    return {
      id,
      name: userName || name,
      color: generateUserColor(id),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extensionOptions = useMemo(() => ({ placeholder }), [placeholder]);

  const { editor, isSynced, connectionStatus } = useCollaborativeEditor({
    noteId,
    user: userInfo,
    extensions: extensionOptions,
    proseSizeClassName: 'prose-base',
  });
  const isEditorReady = editor && isSynced;
  const loadingLabel =
    connectionStatus === 'disconnected' ? 'Reconnecting note…' : 'Loading note…';

  // Floating meeting panel — opened by the `/meeting` slash command, which
  // dispatches `pillow:open-meeting` with the cursor coordinates to anchor it.
  const [meetingAt, setMeetingAt] = useState<{ top: number; left: number } | null>(
    null
  );
  useEffect(() => {
    function open(e: Event) {
      const detail = (e as CustomEvent<{ top: number; left: number }>).detail;
      setMeetingAt(detail);
    }
    window.addEventListener('pillow:open-meeting', open);
    return () => window.removeEventListener('pillow:open-meeting', open);
  }, []);

  return (
    <div className='relative min-h-full w-full'>
      <EditorStyles />
      <CollaborativeEditorStyles />
      {editor ? (
        <>
          <EditorContent
            editor={editor}
            className={`canvas-editor transition-opacity ${
              isEditorReady ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
          {!isEditorReady && (
            <div className='absolute left-0 top-0 text-sm text-text-muted'>
              {loadingLabel}
            </div>
          )}
          {isEditorReady && (
            <>
              <TableControls editor={editor} />
              <ImageControls editor={editor} />
              <SelectionSummarize editor={editor} />
              <VoiceEditButton editor={editor} />
              {meetingAt && (
                <MeetBar
                  noteId={noteId}
                  position={meetingAt}
                  onClose={() => setMeetingAt(null)}
                />
              )}
            </>
          )}
        </>
      ) : (
        <div className='text-sm text-text-muted'>Loading note…</div>
      )}
    </div>
  );
}
