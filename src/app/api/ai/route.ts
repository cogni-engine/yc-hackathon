import { GoogleGenAI } from '@google/genai';

// Server-side only. Set GEMINI_API_KEY in the environment.
export const runtime = 'nodejs';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(req: Request) {
  let body: { prompt?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) {
    return Response.json({ error: 'Missing "prompt".' }, { status: 400 });
  }

  const context = (body.context ?? '').trim();

  // Deterministic stub for mechanical/offline testing (no API key needed).
  // Enable with AI_MOCK=1. Never on in production unless explicitly set.
  if (process.env.AI_MOCK === '1') {
    const source = context || prompt;
    const words = source.split(/\s+/).filter(Boolean).length;
    return Response.json({
      text: `**Summary (mock):** ${source.slice(0, 120)}${
        source.length > 120 ? '…' : ''
      } _(≈${words} words)_`,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'GEMINI_API_KEY is not set on the server.' },
      { status: 500 }
    );
  }

  const contents = context
    ? `Here is the current canvas content (Markdown):\n\n${context}\n\n---\n\nRequest: ${prompt}\n\nRespond in Markdown. Do not restate the existing content unless asked.`
    : prompt;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
    });
    return Response.json({ text: response.text ?? '' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 502 });
  }
}
