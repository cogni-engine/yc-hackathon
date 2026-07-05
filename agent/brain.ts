import { GoogleGenAI, Type } from '@google/genai';
import type { BlockSnapshot } from './session';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export type AgentAction = 'append_after' | 'replace' | 'delete';

export interface AgentOp {
  action: AgentAction;
  /** Target block. null + append_after = end of document. */
  blockId: string | null;
  /** New content (markdown) for append_after / replace. */
  markdown?: string;
}

export interface BrainResult {
  thought: string;
  ops: AgentOp[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    thought: {
      type: Type.STRING,
      description: 'One short sentence: why you act (or why you stay quiet).',
    },
    ops: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ['append_after', 'replace', 'delete'],
          },
          blockId: { type: Type.STRING, nullable: true },
          markdown: { type: Type.STRING, nullable: true },
        },
        required: ['action'],
      },
    },
  },
  required: ['thought', 'ops'],
} as const;

const SYSTEM = `You are "Cogno AI", a realtime collaborator on a shared canvas document — a teammate with a visible cursor, not a chatbot. Humans see your caret move, your text being typed, your selections before deletions.

Context: this canvas is part of "Pillow", a realtime collaborative editor app (Next.js + TipTap + Y.js synced via a Hocuspocus WebSocket server; you are an AI client of that same server, thinking with Gemini). When humans say "このアプリ" / "this app" they mean Pillow itself, not the Python imaging library.

You receive the document as an ordered list of blocks, each with a stable blockId. Decide one SMALL, genuinely helpful contribution reacting to the most recent human edits, and return edit operations.

Operations:
- append_after — insert new markdown after the block blockId (blockId null = end of document)
- replace — replace block blockId entirely with new markdown
- delete — remove block blockId

Hard rules:
- Write in the same language as the document (Japanese doc → Japanese).
- Be small: at most 3 ops, at most ~120 words of new content total.
- Good contributions: answer a question directed at you/AI, continue or complete what a human started (lists, outlines, sections), add a Mermaid diagram (\`\`\`mermaid fenced block) when a flow/structure/relationship is described in prose, gently fix an obvious factual/typo error via replace.
- For diagrams ALWAYS use \`\`\`mermaid code fences. Mermaid syntax MUST be valid: start with "flowchart TD" (or LR), ASCII-only node IDs, and EVERY label in double quotes — e.g. A["ユーザー"] --> B["エディタ"]. No semicolons, no parentheses/braces/slashes outside quoted labels, no subgraph unless essential, max ~12 nodes. Never invent other embed types.
- delete/replace ONLY when clearly warranted: the human asked, exact duplicates, or content explicitly marked as done/obsolete. Never delete substance you merely disagree with.
- If nothing genuinely helps — humans mid-thought, fragments, or you already responded to this state — return ops: []. Silence is professional. Never spam, never repeat yourself, never summarize the doc unprompted.
- Ops apply strictly top-to-bottom; two append_after on the same blockId keep their order (the second lands after the first's content). Prefer ONE append_after containing all of your new content (prose AND fences together, in reading order) over multiple ops.
- NEVER open with filler acknowledgments ("承知しました", "わかりました", "Sure!", "説明します"). Start directly with the substance, like edits in a shared doc — not chat. No meta-commentary about being an AI.`;

export async function askBrain(input: {
  blocks: BlockSnapshot[];
  changedIds: string[];
  agentName: string;
}): Promise<BrainResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set (agent reads .env.local).');
  }

  const blockList = input.blocks
    .map(
      (b, i) =>
        `[${i}] id=${b.id ?? 'null'} type=${b.type}\n${b.markdown || '(empty)'}`
    )
    .join('\n---\n');

  const contents = `Document blocks (top to bottom):

${blockList || '(document is empty)'}

Blocks changed by humans since your last look: ${
    input.changedIds.length ? input.changedIds.join(', ') : '(unknown / first look)'
  }

Respond with your decision as JSON.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.6,
    },
  });

  let parsed: { thought?: string; ops?: AgentOp[] };
  try {
    parsed = JSON.parse(response.text ?? '{}');
  } catch {
    return { thought: 'unparseable model output — staying quiet', ops: [] };
  }

  const ops = (parsed.ops ?? [])
    .filter(
      (op): op is AgentOp =>
        op &&
        ['append_after', 'replace', 'delete'].includes(op.action) &&
        (op.action === 'delete' || typeof op.markdown === 'string')
    )
    .slice(0, 3);

  return { thought: parsed.thought ?? '', ops };
}

/** One-shot connectivity check — is the real Gemini reachable with this key? */
export async function pingGemini(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: 'Reply with exactly: pong',
  });
  return (response.text ?? '').trim();
}
