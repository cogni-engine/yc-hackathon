export const runtime = 'nodejs';

const BRIDGE_URL = process.env.GBRAIN_BRIDGE_URL || 'http://localhost:3131';

// Liveness check for the /gbrain dev page. Hits the bridge's /health directly
// so it does NOT pollute the query log (unlike a real /query).
export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return Response.json({ ok: false, status: res.status }, { status: 200 });
    const data = await res.json().catch(() => ({}));
    return Response.json({ ok: true, ...data });
  } catch {
    return Response.json({ ok: false, error: 'unreachable' }, { status: 200 });
  }
}
