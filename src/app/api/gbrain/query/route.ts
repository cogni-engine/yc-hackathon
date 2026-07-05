import { gbrainQueryLogged, type GbrainMode } from '@/lib/gbrain';

export const runtime = 'nodejs';

// Manual query from the /gbrain dev page. Runs against the same brain the AI
// uses, and is recorded in the shared query log (source: 'manual').
export async function POST(req: Request) {
  let body: { q?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const q = (body.q ?? '').trim();
  if (!q) return Response.json({ error: 'Missing "q".' }, { status: 400 });
  const mode: GbrainMode = body.mode === 'search' ? 'search' : 'query';

  const result = await gbrainQueryLogged(q, mode, 'manual');
  return Response.json(result);
}
