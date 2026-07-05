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
import { runAiCursorDemo } from './aiCursorDemo';
import { cancelAiEditRun, runAiEditSteps } from './aiEditRunner';
import { normalizeAiEditSteps, type AiEditStep } from './aiEditSteps';

interface CanvasEditorProps {
  /** Room id — the Hocuspocus document is `canvas:{room}`. */
  room: string;
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

async function askAIEdit(payload: {
  prompt: string;
  context?: string;
  selection?: string;
}): Promise<AiEditStep[]> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, mode: 'edit' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

  const steps = normalizeAiEditSteps(data);
  if (steps.length === 0) {
    throw new Error('AI returned no editable steps.');
  }

  return steps;
}

function getEditorText(editor: Editor): string {
  return editor.state.doc
    .textBetween(0, editor.state.doc.content.size, '\n', '\n')
    .trim();
}

function getSelectionText(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  return empty ? '' : editor.state.doc.textBetween(from, to, '\n', '\n').trim();
}

/**
 * Floating "Summarize" button over a drag-selection. Select (drag) text in the
 * canvas → a button appears → it sends just the selected text to the AI and
 * inserts a one-to-two sentence summary as a blockquote right after the
 * selection. Everyone on the room sees it (it flows through the shared Y.Doc).
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

function AiEditBar({ editor }: { editor: Editor }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cancelAiEditRun();
    };
  }, []);

  async function runEdit() {
    const request = prompt.trim();
    if (!request || loading) return;

    setLoading(true);
    setError(null);

    try {
      const steps = await askAIEdit({
        prompt: request,
        context: getEditorText(editor),
        selection: getSelectionText(editor),
      });
      await runAiEditSteps(editor, steps);
      setPrompt('');
    } catch (e) {
      editor.commands.hideAiCursor();
      setError(e instanceof Error ? e.message : 'AI edit failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='sticky bottom-4 z-30 mt-8 rounded-lg border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95'>
      <form
        className='flex items-center gap-2'
        onSubmit={e => {
          e.preventDefault();
          void runEdit();
        }}
      >
        <Sparkles className='size-4 shrink-0 text-sky-500' />
        <input
          value={prompt}
          disabled={loading}
          onChange={e => setPrompt(e.target.value)}
          placeholder='Ask AI to edit the canvas'
          className='min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-100'
        />
        <button
          type='submit'
          disabled={loading || !prompt.trim()}
          aria-label='Run AI edit'
          className='inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400'
        >
          {loading ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Sparkles className='size-4' />
          )}
        </button>
      </form>
      {error ? (
        <div className='px-6 pb-1 text-xs text-red-500'>{error}</div>
      ) : null}
    </div>
  );
}

/**
 * Realtime collaborative canvas — the same TipTap + Y.js + Hocuspocus stack as
 * cogno's task description editor, stripped of auth / tasks / attachments.
 * Multiple clients on the same `room` edit one shared document live. Use the "/"
 * slash menu to insert headings, tables, mermaid diagrams, Excalidraw drawings,
 * columns, etc. The "Ask AI" bar sends the canvas to Gemini and inserts the
 * reply for everyone.
 */
export function CanvasEditor({
  room,
  userName,
  placeholder = 'Type something…',
}: CanvasEditorProps) {
  // A stable random identity per browser session (no auth).
  const userInfo = useMemo(() => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return {
      id,
      name: userName || `Guest ${id.slice(0, 4)}`,
      color: generateUserColor(id),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extensionOptions = useMemo(() => ({ placeholder }), [placeholder]);

  const { editor } = useCollaborativeEditor({
    room,
    user: userInfo,
    extensions: extensionOptions,
    proseSizeClassName: 'prose-base',
  });

  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;

    let autoRunTimer: number | null = null;

    window.runAiCursorDemo = () => runAiCursorDemo(editor);

    const params = new URLSearchParams(window.location.search);
    if (params.has('aiCursorDemo')) {
      autoRunTimer = window.setTimeout(() => {
        void runAiCursorDemo(editor);
      }, 600);
    }

    return () => {
      if (autoRunTimer !== null) {
        window.clearTimeout(autoRunTimer);
      }
      if (window.runAiCursorDemo) {
        delete window.runAiCursorDemo;
      }
    };
  }, [editor]);

  return (
    <div className='relative min-h-full w-full'>
      <EditorStyles />
      <CollaborativeEditorStyles />
      {editor ? (
        <>
          <EditorContent editor={editor} className='canvas-editor' />
          <TableControls editor={editor} />
          <ImageControls editor={editor} />
          <SelectionSummarize editor={editor} />
          <AiEditBar editor={editor} />
        </>
      ) : (
        <div className='text-sm text-neutral-400'>{placeholder}</div>
      )}
    </div>
  );
}
