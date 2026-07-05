import { NextResponse } from 'next/server';

/**
 * Start a Recall.ai bot in a meeting and stream its transcript into a note.
 *
 * POST { meetUrl, noteId } → creates a bot that joins the call and sends
 * real-time `transcript.data` events to the hocuspocus webhook. The bot's
 * `metadata.noteId` tells that webhook which note's Y.Doc to append to.
 *
 * Returns { botId } — the client keeps it so it can /api/recall/stop later.
 *
 * Env:
 *   RECALL_API_KEY     required — workspace API key
 *   RECALL_REGION      e.g. "us-west-2" (host is https://{region}.recall.ai)
 *   RECALL_WEBHOOK_URL public URL of the hocuspocus webhook (…/recall/webhook)
 *   RECALL_LANGUAGE    transcription language code, default "ja"
 */
export async function POST(req: Request) {
  const apiKey = process.env.RECALL_API_KEY;
  const region = process.env.RECALL_REGION;
  const webhookUrl = process.env.RECALL_WEBHOOK_URL;
  if (!apiKey || !region || !webhookUrl) {
    return NextResponse.json(
      { error: 'RECALL_API_KEY / RECALL_REGION / RECALL_WEBHOOK_URL not set' },
      { status: 503 }
    );
  }

  const { meetUrl, noteId } = await req.json();
  if (!meetUrl || !noteId) {
    return NextResponse.json({ error: 'meetUrl and noteId are required' }, { status: 400 });
  }

  const res = await fetch(`https://${region}.recall.ai/api/v1/bot/`, {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meeting_url: meetUrl,
      bot_name: 'Pillow',
      metadata: { noteId: String(noteId) },
      recording_config: {
        transcript: {
          provider: {
            recallai_streaming: {
              language_code: process.env.RECALL_LANGUAGE || 'ja',
            },
          },
        },
        realtime_endpoints: [
          { type: 'webhook', url: webhookUrl, events: ['transcript.data'] },
        ],
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.detail || `Recall error ${res.status}`, raw: data },
      { status: res.status }
    );
  }
  return NextResponse.json({ botId: data.id });
}
