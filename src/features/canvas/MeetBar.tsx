'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, X } from 'lucide-react';

/**
 * Floating meeting panel, opened from the `/meeting` slash command and anchored
 * where it was typed. Paste a Google Meet (or Zoom / Teams) URL and click 参加 —
 * a Recall.ai bot joins the call and its live transcript is appended to this
 * note in real time (via the hocuspocus webhook). Click 停止 to make it leave.
 */
export function MeetBar({
  noteId,
  position,
  onClose,
}: {
  noteId: string;
  position: { top: number; left: number };
  onClose: () => void;
}) {
  const [meetUrl, setMeetUrl] = useState('');
  const [botId, setBotId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'stopping'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function start() {
    if (!meetUrl.trim()) return;
    setStatus('starting');
    setError(null);
    try {
      const res = await fetch('/api/recall/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetUrl: meetUrl.trim(), noteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setBotId(data.botId);
      setStatus('live');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
      setStatus('idle');
    }
  }

  async function stop() {
    if (!botId) return;
    setStatus('stopping');
    try {
      await fetch('/api/recall/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      });
    } catch {
      /* best-effort */
    } finally {
      setBotId(null);
      setStatus('idle');
    }
  }

  // Keep the "live" row visible while stopping so the 停止 button can spin.
  const showLiveRow = status === 'live' || status === 'stopping';

  // Clamp so a panel typed near the right edge doesn't overflow the viewport.
  const left = Math.min(
    position.left,
    (typeof window !== 'undefined' ? window.innerWidth : 1024) - 380
  );

  return (
    <div
      style={{ position: 'fixed', top: position.top, left: Math.max(8, left) }}
      className='z-50 flex w-[360px] items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900'
    >
      <Mic className='size-4 shrink-0 text-neutral-400' />
      {showLiveRow ? (
        <>
          <span className='inline-flex items-center gap-1.5 font-medium text-red-600'>
            <span className='size-2 animate-pulse rounded-full bg-red-600' />
            文字起こし中
          </span>
          <span className='min-w-0 flex-1 truncate text-neutral-400'>{meetUrl}</span>
          <button
            type='button'
            onClick={() => void stop()}
            disabled={status === 'stopping'}
            className='inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900'
          >
            {status === 'stopping' ? (
              <Loader2 className='size-3.5 animate-spin' />
            ) : (
              <Square className='size-3.5' />
            )}
            停止
          </button>
        </>
      ) : (
        <>
          <input
            ref={inputRef}
            type='url'
            value={meetUrl}
            onChange={e => setMeetUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void start();
              if (e.key === 'Escape') onClose();
            }}
            placeholder='https://meet.google.com/xxx-xxxx-xxx'
            className='min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700'
          />
          <button
            type='button'
            onClick={() => void start()}
            disabled={status === 'starting' || !meetUrl.trim()}
            className='inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900'
          >
            {status === 'starting' ? (
              <Loader2 className='size-3.5 animate-spin' />
            ) : (
              <Mic className='size-3.5' />
            )}
            参加
          </button>
        </>
      )}
      <button
        type='button'
        onClick={onClose}
        aria-label='閉じる'
        className='shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800'
      >
        <X className='size-3.5' />
      </button>
      {error && (
        <span className='absolute -bottom-5 left-2 text-xs text-red-500'>{error}</span>
      )}
    </div>
  );
}
