/**
 * Server-side client for the gbrain bridge (see gbrain/bridge.ts).
 * Used by /api/ai to ground answers in the company brain.
 */

const BRIDGE_URL = process.env.GBRAIN_BRIDGE_URL || 'http://localhost:3131';
const BRIDGE_TOKEN = process.env.GBRAIN_BRIDGE_TOKEN || '';

export type GbrainMode = 'query' | 'search';

export interface GbrainQueryResult {
  ok: boolean;
  text?: string;
  error?: string;
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
