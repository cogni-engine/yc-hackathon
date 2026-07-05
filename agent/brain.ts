import Anthropic from '@anthropic-ai/sdk';
import type { BlockSnapshot } from './session';

const MODEL = process.env.AGENT_MODEL || 'claude-opus-4-8';

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
 * Structured-output schema for the decision. Constrains Claude's response to
 * exactly {thought, ops} — no parsing guesswork. Structured outputs require
 * every property listed in `required` and `additionalProperties: false`, so
 * nullable fields are expressed with anyOf(..., null) rather than optionals.
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

const SYSTEM = `You are "Cogno AI", a realtime collaborator on a shared canvas document — a teammate with a visible cursor, not a chatbot. Humans see your caret move, your text being typed, your selections before deletions.

Context: this canvas is part of "Pillow", a realtime collaborative editor app (Next.js + TipTap + Y.js synced via a Hocuspocus WebSocket server; you are an AI client of that same server, thinking with Claude). When humans say "このアプリ" / "this app" they mean Pillow itself, not the Python imaging library.

You receive the document as an ordered list of blocks, each with a stable blockId. This is a LIVE, ongoing collaboration: you remember your own earlier contributions from this conversation, so build on them and never repeat yourself. Decide one SMALL, genuinely helpful contribution reacting to the most recent human edits, and return edit operations.

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
    .slice(0, 3);
}

/**
 * Cogno's thinking brain, powered by Claude.
 *
 * Unlike a stateless one-shot call, the brain keeps the full collaboration as
 * a running Claude conversation: every decision it makes becomes part of the
 * history it sees next time. This is the "stateful watch loop" idea from the
 * standalone impersonator, expressed the Claude-native way — the agent has a
 * genuine memory of what it already wrote, so it continues its own train of
 * thought and avoids re-doing or repeating past contributions. The immutable
 * system prompt is cached across turns.
 */
export class CognoBrain {
  private readonly client: Anthropic;
  private readonly history: Anthropic.MessageParam[] = [];
  /** Keep the conversation bounded so token cost stays flat over a long session. */
  private static readonly MAX_HISTORY = 10;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set (agent reads .env.local).');
    }
    // A jsdom `window` is installed for TipTap, which makes the SDK think it's
    // a browser; this is a trusted local process, so opt in explicitly.
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
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

    this.history.push({ role: 'user', content: userTurn });

    let message: Anthropic.Message;
    try {
      message = await this.client.messages.create({
        model: MODEL,
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
        messages: this.history,
        // Cast: `output_config.format` / adaptive thinking are current-API
        // fields that may lag the installed SDK's static types.
      } as unknown as Anthropic.MessageCreateParamsNonStreaming);
    } catch (err) {
      // Don't poison the history with a turn that got no answer.
      this.history.pop();
      throw err;
    }

    const text = textOf(message);
    let parsed: { thought?: string; ops?: AgentOp[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      this.history.pop();
      return { thought: 'unparseable model output — staying quiet', ops: [] };
    }

    // Record what we decided so the next turn remembers it.
    this.history.push({ role: 'assistant', content: text });
    this.trimHistory();

    return { thought: parsed.thought ?? '', ops: validateOps(parsed) };
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

/** One-shot connectivity check — is Claude reachable with this key? */
export async function pingClaude(): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
  });
  return textOf(message);
}
