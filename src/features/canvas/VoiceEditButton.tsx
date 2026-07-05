'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { normalizeAiEditSteps } from './aiEditSteps';
import { cancelAiEditRun, runAiEditSteps } from './aiEditRunner';

/** Plain-text snapshot of the whole document — the AI's editing context. */
function getEditorText(editor: Editor): string {
  return editor.state.doc
    .textBetween(0, editor.state.doc.content.size, '\n', '\n')
    .trim();
}

/** Current selection as plain text (empty when nothing is selected). */
function getSelectionText(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  return empty ? '' : editor.state.doc.textBetween(from, to, '\n', '\n').trim();
}

/**
 * Pick a recording MIME type the browser supports. We send the container type
 * (without the codec suffix) to Gemini, which accepts ogg / webm / mp4 audio.
 */
function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of candidates) {
    if (
      typeof MediaRecorder !== 'undefined' &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return '';
}

/** Read a Blob as a bare base64 string (no `data:...;base64,` prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

async function askVoiceEdit(payload: {
  audio: { data: string; mimeType: string };
  context: string;
  selection: string;
}) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, mode: 'edit' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  const steps = normalizeAiEditSteps(data);
  if (steps.length === 0) throw new Error('AI returned no editable steps.');
  return steps;
}

type Status = 'idle' | 'recording' | 'processing';

/**
 * Floating voice button (bottom-right). Speak an instruction — "summarize this
 * bit", "add a to-do to buy milk", "turn the last paragraph into bullets" — and
 * the whole note + your selection go to Gemini, which returns edit steps that an
 * animated AI cursor applies. Edits flow through the shared Y.Doc, so everyone
 * on the note sees them. Audio is never stored — it's discarded once Gemini has
 * interpreted it. Manual stop only (click again to finish).
 */
export function VoiceEditButton({ editor }: { editor: Editor }) {
  const [status, setStatus] = useState<Status>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Elapsed-seconds ticker, only while recording.
  useEffect(() => {
    if (status !== 'recording') return;
    setElapsed(0);
    const started = performance.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  // Clean up any live stream on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAiEditRun();
    };
  }, []);

  async function startRecording() {
    if (status !== 'idle') return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void handleStopped(recorder.mimeType || mimeType);
      recorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access denied.'
          : 'Could not start recording.'
      );
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  function stopRecording() {
    if (status !== 'recording') return;
    setStatus('processing');
    recorderRef.current?.stop();
  }

  async function handleStopped(mimeType: string) {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    const blob = new Blob(chunksRef.current, {
      type: mimeType || 'audio/webm',
    });
    chunksRef.current = [];

    if (blob.size === 0) {
      setError('No audio captured.');
      setStatus('idle');
      return;
    }

    try {
      const data = await blobToBase64(blob);
      // Strip the codec suffix — Gemini wants the bare container type.
      const cleanMime = (mimeType || 'audio/webm').split(';')[0];
      const steps = await askVoiceEdit({
        audio: { data, mimeType: cleanMime },
        context: getEditorText(editor),
        selection: getSelectionText(editor),
      });
      await runAiEditSteps(editor, steps);
    } catch (e) {
      editor.commands.hideAiCursor();
      setError(e instanceof Error ? e.message : 'Voice edit failed.');
    } finally {
      setStatus('idle');
    }
  }

  // Auto-dismiss errors after a few seconds.
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(id);
  }, [error]);

  const recording = status === 'recording';
  const processing = status === 'processing';

  return (
    <div className='fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2'>
      {error && (
        <div className='max-w-xs rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white shadow-lg'>
          {error}
        </div>
      )}

      {recording && (
        <div className='flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-neutral-900'>
          <span className='inline-block size-2 animate-pulse rounded-full bg-red-500' />
          {String(Math.floor(elapsed / 60)).padStart(1, '0')}:
          {String(elapsed % 60).padStart(2, '0')}
          <span className='text-neutral-400 dark:text-neutral-500'>
            話して、もう一度押すと編集
          </span>
        </div>
      )}

      <button
        type='button'
        data-testid='voice-edit'
        aria-label={
          recording
            ? 'Stop and apply voice edit'
            : processing
              ? 'Processing voice edit'
              : 'Edit note by voice'
        }
        disabled={processing}
        onClick={() => (recording ? stopRecording() : void startRecording())}
        className={`inline-flex size-14 items-center justify-center rounded-full shadow-lg transition-colors disabled:opacity-70 ${
          recording
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
        }`}
      >
        {processing ? (
          <Loader2 className='size-6 animate-spin' />
        ) : recording ? (
          <Square className='size-5 fill-current' />
        ) : (
          <Mic className='size-6' />
        )}
      </button>
    </div>
  );
}
