/**
 * Server-side client for the gbrain bridge (see gbrain/bridge.ts), plus an
 * in-memory log of the queries the AI runs so the /gbrain dev page can show them.
 *
 * The log is a per-instance ring buffer — fine for local dev and a single
 * server. On multi-instance/serverless it won't be shared across instances;
 * that's acceptable for a debug tool.
 */

const BRIDGE_URL = process.env.GBRAIN_BRIDGE_URL || 'http://localhost:3131';
const BRIDGE_TOKEN = process.env.GBRAIN_BRIDGE_TOKEN || '';

export type GbrainMode = 'query' | 'search';

export interface GbrainQueryResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export interface GbrainLogEntry {
  id: string;
  at: string; // ISO timestamp
  source: 'ai' | 'manual';
  mode: GbrainMode;
  q: string;
  ok: boolean;
  text?: string;
  error?: string;
  ms: number;
}

const LOG_MAX = 100;
const log: GbrainLogEntry[] = [];
let seq = 0;

export function recordQuery(entry: Omit<GbrainLogEntry, 'id' | 'at'>): GbrainLogEntry {
  const e: GbrainLogEntry = {
    ...entry,
    id: String(++seq),
    at: new Date().toISOString(),
  };
  log.unshift(e);
  if (log.length > LOG_MAX) log.length = LOG_MAX;
  return e;
}

export function getQueryLog(): GbrainLogEntry[] {
  return log;
}

/** Call the bridge's /query. Never throws — returns { ok:false, error } instead. */
export async function gbrainQuery(
  q: string,
  mode: GbrainMode = 'query'
): Promise<GbrainQueryResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (BRIDGE_TOKEN) headers.Authorization = `Bearer ${BRIDGE_TOKEN}`;
  try {
    const res = await fetch(`${BRIDGE_URL}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ q, mode }),
      // gbrain query embeds + ranks; give it room.
      signal: AbortSignal.timeout(90_000),
    });
    const data = (await res.json().catch(() => ({}))) as GbrainQueryResult & {
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, text: data.text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch_failed' };
  }
}

/**
 * Query the brain and record it in the log. `source` distinguishes the AI's
 * own retrieval from manual dev-page queries.
 */
export async function gbrainQueryLogged(
  q: string,
  mode: GbrainMode,
  source: 'ai' | 'manual'
): Promise<GbrainQueryResult> {
  const started = Date.now();
  const result = await gbrainQuery(q, mode);
  recordQuery({
    source,
    mode,
    q,
    ok: result.ok,
    text: result.text,
    error: result.error,
    ms: Date.now() - started,
  });
  return result;
}
