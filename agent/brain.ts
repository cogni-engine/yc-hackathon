import { spawn } from 'node:child_process';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, Type } from '@google/genai';
import type { BlockSnapshot } from './session';

/**
 * The agent's brain is pluggable:
 *
 *   AGENT_BRAIN=claude (default) — local Claude subscription via the
 *     `claude -p` headless CLI. No API key, no metered billing: ideal for
 *     local testing. Model: AGENT_CLAUDE_MODEL (default "sonnet").
 *   AGENT_BRAIN=anthropic — Anthropic SDK via ANTHROPIC_API_KEY. Model:
 *     AGENT_MODEL (default claude-opus-4-8).
 *   AGENT_BRAIN=gemini — Google Gemini via GEMINI_API_KEY. Model:
 *     GEMINI_MODEL (default gemini-2.5-flash).
 *
 * All providers share the same bounded conversation memory, so Cogno can build
 * on its own previous edits instead of repeating itself.
 */
export type BrainProvider = 'anthropic-api' | 'claude-cli' | 'gemini';

export function brainProvider(): BrainProvider {
  const v = (process.env.AGENT_BRAIN || 'claude').toLowerCase();
  if (v === 'gemini') return 'gemini';
  if (v === 'anthropic' || v === 'anthropic-api') return 'anthropic-api';
  return 'claude-cli';
}

export function brainModel(): string {
  switch (brainProvider()) {
    case 'anthropic-api':
      return process.env.AGENT_MODEL || 'claude-opus-4-8';
    case 'claude-cli':
      return process.env.AGENT_CLAUDE_MODEL || 'sonnet';
    case 'gemini':
      return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }
}

/** The reflex brain trades depth for latency — smallest capable model. */
export function fastModel(): string {
  if (process.env.AGENT_FAST_MODEL) return process.env.AGENT_FAST_MODEL;
  switch (brainProvider()) {
    case 'anthropic-api':
      return 'claude-haiku-4-5-20251001';
    case 'claude-cli':
      return 'haiku';
    case 'gemini':
      return 'gemini-2.5-flash';
  }
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

/**
 * Structured-output schema for Anthropic. Structured outputs require every
 * property listed in `required` and `additionalProperties: false`, so nullable
 * fields are expressed with anyOf(..., null) rather than optionals.
 */
const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    thought: {
      type: 'string',
      description: 'One short sentence: why you act (or why you stay quiet).',
    },
    ops: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: {
            type: 'string',
            enum: ['append_after', 'replace', 'delete'],
          },
          blockId: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Target block id. null = end of document.',
          },
          markdown: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'New markdown for append_after / replace; null for delete.',
          },
        },
        required: ['action', 'blockId', 'markdown'],
      },
    },
  },
  required: ['thought', 'ops'],
} as const;

/** Same decision shape as RESPONSE_SCHEMA, in Gemini's schema dialect. */
const GEMINI_SCHEMA = {
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

/**
 * Shared appearance contract — injected into BOTH brains. The user cares
 * about the note always LOOKING good more than anything else.
 */
const VISUAL_CONTRACT = `Document appearance contract (HIGHEST priority — the note must always LOOK clean):
- No runs of empty paragraphs (at most one blank between sections). Stray fragments and leftover empty blocks should be deleted.
- Clear hierarchy: headings for sections, lists for enumerations, short paragraphs (≤3 sentences). Prefer restructuring a wall of text into a list.
- Diagrams stay compact (flowchart LR, ≤8 nodes, short labels); never two diagrams about the same thing — edit the existing one.
- Everything you add must leave the document tidier than you found it.`;

const SYSTEM = `You are "Cogno AI", a realtime collaborator on a shared canvas document — a teammate with a visible cursor, not a chatbot. Humans see your caret move, your text being typed, your selections before deletions.

Context: this canvas is part of "Pillow", a realtime collaborative editor app (Next.js + TipTap + Y.js synced via a Hocuspocus WebSocket server; you are an AI client of that same server). When humans say "このアプリ" / "this app" they mean Pillow itself, not the Python imaging library.

You receive the document as an ordered list of blocks, each with a stable blockId. This is a LIVE, ongoing collaboration: you remember your own earlier contributions from this conversation, so build on them and never repeat yourself. Decide one SMALL, genuinely helpful contribution reacting to the most recent human edits, and return edit operations.

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
- Diagrams are a first-class tool — use one PROACTIVELY whenever content describes a flow, structure, timeline, relationship, or comparison (not only when asked). ALWAYS a \`\`\`mermaid fence, and the syntax MUST be valid:
  * flowchart LR (PREFER LR — compact; use TD only for genuinely hierarchical trees) — ASCII-only node IDs, EVERY label in double quotes: A["ユーザー"] --> B["エディタ"]. No semicolons, no parens/braces/slashes outside quoted labels, no subgraph unless essential. Keep labels SHORT (≤8 chars when possible) and diagrams SMALL: max ~8 nodes.
  * sequenceDiagram — declare participants first (participant A as ユーザー), then A->>B: メッセージ. No quotes needed in messages; keep under ~8 exchanges.
  * stateDiagram-v2 — [*] --> 状態名, 状態名 --> 次の状態: ラベル. Simple names, no special characters.
  Tables (markdown |) are also welcome for comparisons. Never invent other embed types.
- To MODIFY an existing diagram, use replace on that mermaid block with the complete new \`\`\`mermaid fence, keeping unchanged lines byte-identical — only changed lines animate (parts of the diagram visibly erased/redrawn). Prefer editing an existing diagram over adding a second one about the same thing.
- delete/replace when asked (explicitly or clearly implied: duplicates, obsolete/done items, content the humans marked as wrong). Don't delete substance you merely disagree with.
- Ops apply strictly top-to-bottom; two append_after on the same blockId keep their order (the second lands after the first's content). Prefer ONE append_after containing all of your new content (prose AND fences together, in reading order) over multiple ops.
- NEVER open with filler acknowledgments ("承知しました", "わかりました", "Sure!", "説明します"). Start directly with the substance, like edits in a shared doc — not chat. No meta-commentary about being an AI.

You also OWN the document's overall visual quality. When the doc has grown messy (stray fragments, empty-paragraph runs, inconsistent headings, redundant blocks), tidying it up IS a valuable contribution on its own — do it without being asked.

${VISUAL_CONTRACT}`;

/**
 * The reflex system prompt: fired while the human is STILL TYPING. One tiny,
 * immediately-useful action, never in their way.
 */
const SYSTEM_FAST = `You are the reflexes of "Cogno AI", an AI collaborator inside a shared realtime document. A human is typing RIGHT NOW — you react while they write, like a colleague who starts scaffolding the moment they see where you're going.

You get the document as blocks (each with a blockId) plus which block the human is actively editing. Decide ONE tiny action you can take IMMEDIATELY that helps without getting in their way:
- They started a heading / list / section → scaffold it BELOW (skeleton bullets, an empty checklist, a starter table) so it's ready when they finish the line.
- They're mid-list → add the obviously-missing next item(s).
- A very short direct question appeared → answer in one line.
- You spot a clear typo or a leftover empty fragment ELSEWHERE → fix/delete it.

Hard rules:
- NEVER touch the block the human is actively editing (activeBlockId) — work after/below it or elsewhere.
- At most 2 ops, at most ~40 words of new content. Smaller is better; [] is fine when nothing clearly helps RIGHT NOW (the deep brain handles the rest later).
- Same language as the document. No filler, no meta-commentary.
- Ops: append_after (blockId | null = end), replace, delete — with markdown content.

${VISUAL_CONTRACT}`;

function renderBlocks(blocks: BlockSnapshot[]): string {
  return (
    blocks
      .map(
        (b, i) =>
          `[${i}] id=${b.id ?? 'null'} type=${b.type}\n${b.markdown || '(empty)'}`
      )
      .join('\n---\n') || '(document is empty)'
  );
}

/** Extract the plain-text (non-thinking) blocks Claude returned. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
}

function validateOps(raw: unknown): AgentOp[] {
  const ops = Array.isArray((raw as { ops?: unknown })?.ops)
    ? ((raw as { ops: unknown[] }).ops as AgentOp[])
    : [];
  return ops
    .filter(
      (op): op is AgentOp =>
        !!op &&
        ['append_after', 'replace', 'delete'].includes(op.action) &&
        (op.action === 'delete' || typeof op.markdown === 'string')
    )
    .map(op => ({ ...op, blockId: op.blockId ?? null }))
    .slice(0, 3);
}

/**
 * Loose JSON extraction for CLI mode. Tolerates a fenced reply, but never
 * fence-scans a reply that already starts with "{" because op markdown may
 * legitimately contain ```mermaid fences inside JSON strings.
 */
function extractJson(text: string): string {
  let raw = text.trim();
  if (!raw.startsWith('{')) {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) raw = fence[1].trim();
  }
  if (!raw.startsWith('{')) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  }
  return raw;
}

const CLI_JSON_INSTRUCTION = `

Output format — reply with ONLY a JSON object, no prose, no code fences:
{"thought": "<one short sentence>", "ops": [{"action": "append_after" | "replace" | "delete", "blockId": "<id or null>", "markdown": "<markdown or null>"}]}`;

/** One-shot generation through the local \`claude\` CLI (subscription auth). */
function runClaudeCli(
  prompt: string,
  timeoutMs = 120_000,
  model = brainModel()
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'claude',
      [
        '-p',
        '--model',
        model,
        '--output-format',
        'json',
        '--max-turns',
        '1',
        '--strict-mcp-config',
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        // Reactive decisions don't need extended thinking — disabling it cuts
        // CLI latency roughly in half on Sonnet.
        env: { ...process.env, MAX_THINKING_TOKENS: '0' },
      }
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

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Cogno's stateful brain. Keeps the collaboration as a running conversation:
 * every decision it makes becomes part of the history it sees next time.
 */
export class CognoBrain {
  private readonly anthropic: Anthropic | null;
  private readonly gemini: GoogleGenAI | null;
  private readonly history: Turn[] = [];
  /** Keep the conversation bounded so token cost stays flat over a long session. */
  private static readonly MAX_HISTORY = 10;

  constructor() {
    const provider = brainProvider();
    // A jsdom `window` is installed for TipTap, which makes the SDK think it's
    // a browser; this is a trusted local process, so opt in explicitly.
    this.anthropic =
      provider === 'anthropic-api'
        ? new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            dangerouslyAllowBrowser: true,
          })
        : null;
    this.gemini =
      provider === 'gemini'
        ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
        : null;
  }

  async think(input: {
    blocks: BlockSnapshot[];
    changedIds: string[];
  }): Promise<BrainResult> {
    const userTurn = `Document blocks (top to bottom):

${renderBlocks(input.blocks)}

Blocks changed by humans since your last look: ${
      input.changedIds.length ? input.changedIds.join(', ') : '(unknown / first look)'
    }

Respond with your decision as JSON.`;

    // Compact older user turns: the doc snapshot in them is stale (the current
    // turn carries the fresh one) and re-sending it every time bloats latency.
    // The assistant turns — what the brain decided — are the useful memory.
    for (const turn of this.history) {
      if (turn.role === 'user') {
        turn.content = '(older document snapshot omitted — your decisions below still apply)';
      }
    }
    this.history.push({ role: 'user', content: userTurn });

    let text: string;
    try {
      text = this.anthropic
        ? await this.thinkApi()
        : this.gemini
          ? await this.thinkGemini()
          : await this.thinkCli();
    } catch (err) {
      // Don't poison the history with a turn that got no answer.
      this.history.pop();
      throw err;
    }

    let parsed: { thought?: string; ops?: AgentOp[] };
    try {
      parsed = JSON.parse(
        this.anthropic || this.gemini ? text : extractJson(text)
      );
    } catch {
      this.history.pop();
      return {
        thought: `unparseable model output — staying quiet (got: ${text.slice(0, 120)}…)`,
        ops: [],
      };
    }

    // Record what we decided so the next turn remembers it.
    this.history.push({ role: 'assistant', content: text });
    this.trimHistory();

    return { thought: parsed.thought ?? '', ops: validateOps(parsed) };
  }

  private async thinkGemini(): Promise<string> {
    const response = await this.gemini!.models.generateContent({
      model: brainModel(),
      contents: this.history.map(t => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
      })),
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SCHEMA,
        temperature: 0.6,
      },
    });
    return response.text ?? '{}';
  }

  private async thinkApi(): Promise<string> {
    const message = await this.anthropic!.messages.create({
      model: brainModel(),
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      // effort low keeps the reactive decision fast; structured outputs
      // guarantee the {thought, ops} shape.
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      messages: this.history.map(t => ({ role: t.role, content: t.content })),
      // Cast: `output_config.format` / adaptive thinking are current-API
      // fields that may lag the installed SDK's static types.
    } as unknown as Anthropic.MessageCreateParamsNonStreaming);
    return textOf(message);
  }

  private async thinkCli(): Promise<string> {
    // The CLI is stateless per call; replay the bounded transcript so it has
    // the same memory semantics as API mode.
    const transcript = this.history
      .map(t =>
        t.role === 'user'
          ? `[HUMAN TURN]\n${t.content}`
          : `[YOUR PAST DECISION]\n${t.content}`
      )
      .join('\n\n');
    return runClaudeCli(`${SYSTEM}\n\n---\n\n${transcript}${CLI_JSON_INSTRUCTION}`);
  }

  /** Keep the last MAX_HISTORY messages, always starting on a user turn. */
  private trimHistory(): void {
    while (this.history.length > CognoBrain.MAX_HISTORY) {
      this.history.shift();
    }
    while (this.history.length && this.history[0].role !== 'user') {
      this.history.shift();
    }
  }
}

/** Compatibility wrapper for older callers that expected a one-shot function. */
export async function askBrain(input: {
  blocks: BlockSnapshot[];
  changedIds: string[];
  agentName: string;
}): Promise<BrainResult> {
  return new CognoBrain().think(input);
}

/**
 * The reflex brain: a single stateless, small-model call fired while the
 * human is still typing. Returns at most 2 tiny ops.
 */
export async function quickThink(input: {
  blocks: BlockSnapshot[];
  changedIds: string[];
  activeBlockId: string | null;
}): Promise<BrainResult> {
  const userTurn = `Document blocks (top to bottom):

${renderBlocks(input.blocks)}

The human is ACTIVELY TYPING right now. activeBlockId (do not touch): ${
    input.activeBlockId ?? '(unknown)'
  }
Recently changed blocks: ${input.changedIds.join(', ') || '(unknown)'}

Respond with your decision as JSON.`;

  const provider = brainProvider();
  let text: string;
  if (provider === 'anthropic-api') {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      dangerouslyAllowBrowser: true,
    });
    const message = await client.messages.create({
      model: fastModel(),
      max_tokens: 800,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
      system: [
        { type: 'text', text: SYSTEM_FAST, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userTurn }],
    } as unknown as Anthropic.MessageCreateParamsNonStreaming);
    text = textOf(message);
  } else if (provider === 'gemini') {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await client.models.generateContent({
      model: fastModel(),
      contents: userTurn,
      config: {
        systemInstruction: SYSTEM_FAST,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SCHEMA,
        temperature: 0.4,
      },
    });
    text = response.text ?? '{}';
  } else {
    text = await runClaudeCli(
      `${SYSTEM_FAST}\n\n---\n\n${userTurn}${CLI_JSON_INSTRUCTION}`,
      60_000,
      fastModel()
    );
  }

  let parsed: { thought?: string; ops?: AgentOp[] };
  try {
    parsed = JSON.parse(provider === 'claude-cli' ? extractJson(text) : text);
  } catch {
    return { thought: 'reflex: unparseable — skipping', ops: [] };
  }
  return { thought: parsed.thought ?? '', ops: validateOps(parsed).slice(0, 2) };
}

/** One-shot connectivity check — is the configured brain actually reachable? */
export async function pingBrain(): Promise<string> {
  switch (brainProvider()) {
    case 'claude-cli':
      return (await runClaudeCli('Reply with exactly: pong', 60_000)).trim();
    case 'gemini': {
      if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: brainModel(),
        contents: 'Reply with exactly: pong',
      });
      return (response.text ?? '').trim();
    }
    case 'anthropic-api': {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set.');
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      const message = await client.messages.create({
        model: brainModel(),
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
      });
      return textOf(message);
    }
  }
}
