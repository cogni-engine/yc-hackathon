import { GoogleGenAI } from '@google/genai';
import {
  normalizeAiEditSteps,
  type AiEditResponse,
  type AiEditStep,
} from '@/features/canvas/aiEditSteps';
import { gbrainQueryLogged } from '@/lib/gbrain';

// Server-side only. Set GEMINI_API_KEY in the environment.
export const runtime = 'nodejs';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_AI_EDIT_STEPS = 24;
const MAX_AI_EDIT_TEXT = 4000;
const MAX_AI_TARGET_TEXT = 500;

interface AiRequestBody {
  prompt?: string;
  context?: string;
  selection?: string;
  mode?: 'text' | 'edit';
  /** Spoken instruction, base64-encoded audio + its MIME type. Edit mode only. */
  audio?: { data: string; mimeType: string };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1]);
    }

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error('AI did not return valid JSON.');
  }
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function limitAiEditSteps(steps: AiEditStep[]): AiEditStep[] {
  return steps.slice(0, MAX_AI_EDIT_STEPS).map(step => {
    switch (step.tool) {
      case 'insert_markdown':
        return {
          ...step,
          markdown: truncate(step.markdown, MAX_AI_EDIT_TEXT),
        };
      case 'append_markdown':
        return {
          ...step,
          markdown: truncate(step.markdown, MAX_AI_EDIT_TEXT),
        };
      case 'replace_text':
        return {
          ...step,
          target: truncate(step.target, MAX_AI_TARGET_TEXT),
          replacement: truncate(step.replacement, MAX_AI_EDIT_TEXT),
        };
      case 'replace_selection':
        return {
          ...step,
          markdown: truncate(step.markdown, MAX_AI_EDIT_TEXT),
        };
      case 'delete_text':
        return {
          ...step,
          target: truncate(step.target, MAX_AI_TARGET_TEXT),
        };
      default:
        return step;
    }
  });
}

function buildEditPrompt(
  prompt: string,
  context: string,
  selection: string
): string {
  return `You are an AI collaborator editing a shared TipTap/Yjs canvas.

Return only a JSON object with this shape:
{"steps":[{"tool":"show_cursor","anchor":"selection"},{"tool":"replace_text","target":"exact text","replacement":"new text"},{"tool":"hide_cursor"}]}

Allowed tools:
- show_cursor: {"tool":"show_cursor","anchor":"selection"|"document_start"|"document_end"}
- move_cursor: {"tool":"move_cursor","anchor":"selection"|"document_start"|"document_end"}
- replace_text: {"tool":"replace_text","target":"exact existing text","replacement":"plain replacement text","occurrence":"first"|"last"|"all"}
- replace_selection: {"tool":"replace_selection","markdown":"markdown replacement for the current selected text"}
- delete_text: {"tool":"delete_text","target":"exact existing text","occurrence":"first"|"last"|"all"}
- insert_markdown: {"tool":"insert_markdown","markdown":"markdown to insert","anchor":"selection"|"document_start"|"document_end"}
- append_markdown: {"tool":"append_markdown","markdown":"markdown to append"}
- hide_cursor: {"tool":"hide_cursor"}

Rules:
- Prefer replace_text when the request clearly edits text that already exists.
- Prefer replace_selection when selected text is present and the request edits that selection.
- The target for replace_text and delete_text must be copied exactly from the document or selected text.
- Use insert_markdown or append_markdown for new material.
- Do not include explanations, comments, or prose outside JSON.
- Include show_cursor before editing and hide_cursor after editing.

Current selected text:
${selection || '(none)'}

Current document text:
${context || '(empty)'}

User request:
${prompt}`;
}

export async function POST(req: Request) {
  let body: AiRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  const audio = body.audio;
  const hasAudio =
    !!audio &&
    typeof audio.data === 'string' &&
    !!audio.data &&
    typeof audio.mimeType === 'string' &&
    !!audio.mimeType;
  // A request needs either a typed prompt or spoken audio (edit mode).
  if (!prompt && !hasAudio) {
    return Response.json({ error: 'Missing "prompt".' }, { status: 400 });
  }

  const context = (body.context ?? '').trim();
  const selection = (body.selection ?? '').trim();
  const mode = body.mode === 'edit' ? 'edit' : 'text';

  // Deterministic stub for mechanical/offline testing (no API key needed).
  // Enable with AI_MOCK=1. Never on in production unless explicitly set.
  if (process.env.AI_MOCK === '1') {
    if (mode === 'edit') {
      return Response.json({
        steps: [
          { tool: 'show_cursor', anchor: 'selection' },
          {
            tool: 'append_markdown',
            markdown: `AI edit (mock): ${prompt || '(spoken request)'}`,
          },
          { tool: 'hide_cursor' },
        ],
      } satisfies AiEditResponse);
    }

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

  // Retrieve relevant company-brain context from gbrain (best-effort: if the
  // bridge is down or empty we just proceed without it). This is the moment
  // gbrain's contents reach the AI — every /api/ai call queries the brain first.
  const brain = await gbrainQueryLogged(selection ? `${prompt}\n\n${selection}` : prompt, 'query', 'ai');
  const brainBlock =
    brain.ok && brain.text
      ? `Relevant knowledge from the company brain (gbrain). Use it to ground your answer; cite page slugs when you rely on them:\n\n${brain.text}\n\n---\n\n`
      : '';

  const contents = context
    ? `${brainBlock}Here is the current canvas content (Markdown):\n\n${context}\n\n---\n\nRequest: ${prompt}\n\nRespond in Markdown. Do not restate the existing content unless asked.`
    : `${brainBlock}${prompt}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    if (mode === 'edit') {
      // When the request is spoken, the instruction lives in the attached
      // audio; tell the model to read it from there instead of the text field.
      const editPrompt = `${brainBlock}${buildEditPrompt(
        prompt || 'The user request is in the attached audio. Interpret it.',
        context,
        selection
      )}`;
      const contents =
        hasAudio && audio
          ? [
              {
                role: 'user',
                parts: [
                  { text: editPrompt },
                  { inlineData: { mimeType: audio.mimeType, data: audio.data } },
                ],
              },
            ]
          : editPrompt;
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      const parsed = extractJson(response.text ?? '');
      const steps = limitAiEditSteps(normalizeAiEditSteps(parsed));

      if (steps.length === 0) {
        return Response.json(
          { error: 'AI did not return any valid edit steps.' },
          { status: 502 }
        );
      }

      return Response.json({ steps } satisfies AiEditResponse);
    }

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
