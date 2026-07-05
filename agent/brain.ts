import { spawn } from 'node:child_process';
import { GoogleGenAI, Type } from '@google/genai';
import type { BlockSnapshot } from './session';

/**
 * The agent's "brain" is pluggable:
 *
 *   AGENT_BRAIN=claude (default) — local Claude subscription via the
 *     `claude -p` headless CLI. No API key, no metered billing: ideal for
 *     local testing. Model: AGENT_CLAUDE_MODEL (default "sonnet" = latest
 *     Sonnet).
 *   AGENT_BRAIN=gemini — Google Gemini via GEMINI_API_KEY (the same key the
 *     Next.js /api/ai route uses). Model: GEMINI_MODEL (default
 *     gemini-2.5-flash).
 */
export type BrainProvider = 'claude' | 'gemini';

export function brainProvider(): BrainProvider {
  const v = (process.env.AGENT_BRAIN || 'claude').toLowerCase();
  return v === 'gemini' ? 'gemini' : 'claude';
}

export function brainModel(): string {
  return brainProvider() === 'claude'
    ? process.env.AGENT_CLAUDE_MODEL || 'sonnet'
    : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

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

Context: this canvas is part of "Pillow", a realtime collaborative editor app (Next.js + TipTap + Y.js synced via a Hocuspocus WebSocket server; you are an AI client of that same server). When humans say "このアプリ" / "this app" they mean Pillow itself, not the Python imaging library.

You receive the document as an ordered list of blocks, each with a stable blockId. Decide one SMALL, genuinely helpful contribution reacting to the most recent human edits, and return edit operations.

Operations:
- append_after — insert new markdown after the block blockId (blockId null = end of document)
- replace — replace block blockId entirely with new markdown
- delete — remove block blockId

Behavior — you are an ACTIVE collaborator (this is a live demo; lean toward acting):
- If a human addresses you in the recent changes (your name, "Cogno", "AI(さん)", or any question / request / 依頼) you MUST respond with at least one op. Even if you answered something similar before, answer again — better, or adapted to what they just wrote. Never leave a direct address unanswered.
- When humans add substantive new content, contribute: continue lists/outlines/sections they started, answer implicit questions, add a Mermaid diagram when a flow/structure/relationship is described, tidy or restructure when asked.
- Scan the whole doc for still-unfulfilled requests (削除して, まとめて, 図にして, …) and fulfill them — even older ones.
- Return ops: [] ONLY when the newest change is clearly a mid-typing fragment with no request in it, or when literally nothing changed since your last action.

Hard rules:
- Write in the same language as the document (Japanese doc → Japanese).
- Keep each contribution digestible: at most 3 ops, ~150 words of new content total.
- For diagrams ALWAYS use \`\`\`mermaid code fences. Mermaid syntax MUST be valid: start with "flowchart TD" (or LR), ASCII-only node IDs, and EVERY label in double quotes — e.g. A["ユーザー"] --> B["エディタ"]. No semicolons, no parentheses/braces/slashes outside quoted labels, no subgraph unless essential, max ~12 nodes. Never invent other embed types.
- delete/replace when asked (explicitly or clearly implied: duplicates, obsolete/done items, content the humans marked as wrong). Don't delete substance you merely disagree with.
- Ops apply strictly top-to-bottom; two append_after on the same blockId keep their order (the second lands after the first's content). Prefer ONE append_after containing all of your new content (prose AND fences together, in reading order) over multiple ops.
- NEVER open with filler acknowledgments ("承知しました", "わかりました", "Sure!", "説明します"). Start directly with the substance, like edits in a shared doc — not chat. No meta-commentary about being an AI.`;

function buildContents(input: {
  blocks: BlockSnapshot[];
  changedIds: string[];
}): string {
  const blockList = input.blocks
    .map(
      (b, i) =>
        `[${i}] id=${b.id ?? 'null'} type=${b.type}\n${b.markdown || '(empty)'}`
    )
    .join('\n---\n');

  return `Document blocks (top to bottom):

${blockList || '(document is empty)'}

Blocks changed by humans since your last look: ${
    input.changedIds.length ? input.changedIds.join(', ') : '(unknown / first look)'
  }

Respond with your decision as JSON.`;
}

/** Parse + validate the model's JSON (tolerates ``` fences) into ops. */
function parseBrainResponse(text: string): BrainResult {
  let raw = text.trim();
  // Only unwrap a fence when the whole reply is wrapped in one — the ops
  // markdown legitimately contains ```mermaid fences INSIDE JSON strings, and
  // a blind fence-extract would grab those instead of the JSON body.
  if (!raw.startsWith('{')) {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) raw = fence[1].trim();
  }
  // Fall back to the outermost {...} if the model added prose around it.
  if (!raw.startsWith('{')) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  }

  let parsed: { thought?: string; ops?: AgentOp[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      thought: `unparseable model output — staying quiet (got: ${raw.slice(0, 120)}…)`,
      ops: [],
    };
  }

  const ops = (parsed.ops ?? [])
    .filter(
      (op): op is AgentOp =>
        op &&
        ['append_after', 'replace', 'delete'].includes(op.action) &&
        (op.action === 'delete' || typeof op.markdown === 'string')
    )
    .map(op => ({ ...op, blockId: op.blockId ?? null }))
    .slice(0, 3);

  return { thought: parsed.thought ?? '', ops };
}

// ------------------------------------------------------------------ gemini

async function generateGemini(contents: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set (agent reads .env.local).');
  }
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: brainModel(),
    contents,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.6,
    },
  });
  return response.text ?? '{}';
}

// ------------------------------------------------------------------ claude

const CLAUDE_JSON_INSTRUCTION = `

Output format — reply with ONLY a JSON object, no prose, no code fences:
{"thought": "<one short sentence>", "ops": [{"action": "append_after" | "replace" | "delete", "blockId": "<id or null>", "markdown": "<markdown or null>"}]}`;

/**
 * One-shot generation through the local \`claude\` CLI in headless print mode
 * (-p). Uses the developer's Claude subscription — no API key needed.
 */
function runClaude(prompt: string, timeoutMs = 90_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'claude',
      [
        '-p',
        '--model',
        brainModel(),
        '--output-format',
        'json',
        '--max-turns',
        '1',
        '--strict-mcp-config',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`claude CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', d => (stdout += d));
    child.stderr.on('data', d => (stderr += d));
    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude CLI exited ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      try {
        // --output-format json wraps the reply in an envelope.
        const envelope = JSON.parse(stdout) as {
          is_error?: boolean;
          result?: string;
        };
        if (envelope.is_error) {
          reject(new Error(`claude CLI error: ${envelope.result}`));
          return;
        }
        resolve(envelope.result ?? '');
      } catch {
        resolve(stdout);
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function generateClaude(contents: string): Promise<string> {
  return runClaude(`${SYSTEM}\n\n---\n\n${contents}${CLAUDE_JSON_INSTRUCTION}`);
}

// ------------------------------------------------------------------ public

export async function askBrain(input: {
  blocks: BlockSnapshot[];
  changedIds: string[];
  agentName: string;
}): Promise<BrainResult> {
  const contents = buildContents(input);
  const text =
    brainProvider() === 'claude'
      ? await generateClaude(contents)
      : await generateGemini(contents);
  return parseBrainResponse(text);
}

/** One-shot connectivity check — is the configured brain actually reachable? */
export async function pingBrain(): Promise<string> {
  if (brainProvider() === 'claude') {
    return (await runClaude('Reply with exactly: pong', 60_000)).trim();
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: brainModel(),
    contents: 'Reply with exactly: pong',
  });
  return (response.text ?? '').trim();
}
