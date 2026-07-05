'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Developer inspection page for the gbrain company brain.
 *
 * - Run a query by hand against the brain (same path the AI uses).
 * - Watch the live log of queries the AI runs on every /api/ai call.
 *
 * This is a test/debug surface, not a user-facing feature.
 */

type Mode = 'query' | 'search';

interface LogEntry {
  id: string;
  at: string;
  source: 'ai' | 'manual';
  mode: Mode;
  q: string;
  ok: boolean;
  text?: string;
  error?: string;
  ms: number;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString();
}

export default function GbrainDevPage() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<Mode>('query');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text?: string; error?: string } | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<string>('…');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshLog = useCallback(async () => {
    try {
      const res = await fetch('/api/gbrain/log', { cache: 'no-store' });
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      /* ignore transient poll errors */
    }
  }, []);

  useEffect(() => {
    refreshLog();
    pollRef.current = setInterval(refreshLog, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshLog]);

  useEffect(() => {
    fetch('/api/gbrain/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'ping', mode: 'search' }),
    })
      .then(r => setHealth(r.ok ? 'reachable' : `error ${r.status}`))
      .catch(() => setHealth('unreachable'));
  }, []);

  const run = useCallback(async () => {
    const query = q.trim();
    if (!query || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/gbrain/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, mode }),
      });
      const data = await res.json();
      setResult(data);
      refreshLog();
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'failed' });
    } finally {
      setRunning(false);
    }
  }, [q, mode, running, refreshLog]);

  return (
    <main className='mx-auto min-h-screen w-full max-w-3xl px-4 py-8'>
      <header className='mb-6'>
        <h1 className='text-xl font-semibold'>gbrain — company brain inspector</h1>
        <p className='mt-1 text-sm opacity-70'>
          Dev/test surface. Bridge:{' '}
          <span className={health === 'reachable' ? 'text-green-600' : 'text-red-600'}>
            {health}
          </span>
        </p>
      </header>

      {/* Manual query */}
      <section className='mb-8 rounded-lg border border-[var(--border-default)] p-4'>
        <div className='flex flex-col gap-2 sm:flex-row'>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') run();
            }}
            placeholder='Ask the brain… (e.g. "what did we decide about pricing?")'
            className='flex-1 rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]'
          />
          <select
            value={mode}
            onChange={e => setMode(e.target.value as Mode)}
            className='rounded-md border border-[var(--border-default)] bg-transparent px-2 py-2 text-sm'
          >
            <option value='query'>query (hybrid)</option>
            <option value='search'>search (keyword)</option>
          </select>
          <button
            onClick={run}
            disabled={running || !q.trim()}
            className='rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black'
          >
            {running ? 'Running…' : 'Run'}
          </button>
        </div>

        {result && (
          <div className='mt-4'>
            {result.ok ? (
              <pre className='max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--surface-secondary)] p-3 text-xs'>
                {result.text || '(no matches)'}
              </pre>
            ) : (
              <p className='text-sm text-red-600'>Error: {result.error}</p>
            )}
          </div>
        )}
      </section>

      {/* Query log */}
      <section>
        <div className='mb-2 flex items-center justify-between'>
          <h2 className='text-sm font-semibold uppercase tracking-wide opacity-70'>
            Query log (AI + manual)
          </h2>
          <button onClick={refreshLog} className='text-xs opacity-60 hover:opacity-100'>
            refresh
          </button>
        </div>

        {entries.length === 0 ? (
          <p className='text-sm opacity-60'>
            No queries yet. Ask above, or trigger the AI (Summarize / edit) in a note.
          </p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {entries.map(e => (
              <li
                key={e.id}
                className='rounded-md border border-[var(--border-default)] p-3 text-sm'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      e.source === 'ai'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    {e.source}
                  </span>
                  <span className='text-xs opacity-60'>{e.mode}</span>
                  <span className='text-xs opacity-60'>{timeAgo(e.at)}</span>
                  <span className='text-xs opacity-60'>{e.ms}ms</span>
                  {!e.ok && <span className='text-xs text-red-600'>error</span>}
                </div>
                <div className='mt-1 font-medium'>{e.q}</div>
                {e.ok
                  ? e.text && (
                      <pre className='mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-[var(--surface-secondary)] p-2 text-xs opacity-80'>
                        {e.text}
                      </pre>
                    )
                  : e.error && <div className='mt-1 text-xs text-red-600'>{e.error}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
