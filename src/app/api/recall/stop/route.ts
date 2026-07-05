import { NextResponse } from 'next/server';

/**
 * Make a Recall.ai bot leave the call. POST { botId }.
 */
export async function POST(req: Request) {
  const apiKey = process.env.RECALL_API_KEY;
  const region = process.env.RECALL_REGION;
  if (!apiKey || !region) {
    return NextResponse.json(
      { error: 'RECALL_API_KEY / RECALL_REGION not set' },
      { status: 503 }
    );
  }

  const { botId } = await req.json();
  if (!botId) {
    return NextResponse.json({ error: 'botId is required' }, { status: 400 });
  }

  const res = await fetch(
    `https://${region}.recall.ai/api/v1/bot/${botId}/leave_call/`,
    { method: 'POST', headers: { Authorization: `Token ${apiKey}` } }
  );
  if (!res.ok && res.status !== 200) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: data?.detail || `Recall error ${res.status}` },
      { status: res.status }
    );
  }
  return NextResponse.json({ ok: true });
}
