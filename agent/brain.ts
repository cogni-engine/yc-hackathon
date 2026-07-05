import { spawn } from 'node:child_process';
import Anthropic from '@anthropic-ai/sdk';
import type { BlockSnapshot } from './session';

/**
 * Cogno's thinking brain, powered by Claude, in one of two modes:
 *
 *   api — ANTHROPIC_API_KEY is set → Anthropic SDK with structured outputs,
 *         adaptive thinking, and prompt caching. Model: AGENT_MODEL
 *         (default claude-opus-4-8).
 *   cli — no API key → the local `claude` CLI in headless print mode, which
 *         uses the developer's Claude subscription. Model: AGENT_MODEL
 *         (default "sonnet" = latest Sonnet). Ideal for local testing.
 *
 * Both modes share the same conversation memory: every decision becomes part
 * of the history the brain sees next time, so it builds on its own past
 * contributions instead of re-reacting from scratch.
 */
export function brainMode(): 'api' | 'cli' {
  return process.env.ANTHROPIC_API_KEY ? 'api' : 'cli';
}

export function brainModel(): string {
  return (
    process.env.AGENT_MODEL ||
    (brainMode() === 'api' ? 'claude-opus-4-8' : 'sonnet')
  );
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
 * Loose JSON extraction for CLI mode (no structured outputs there). Tolerates
 * a fenced reply, but never fence-scans a reply that already starts with '{'
 * — op markdown legitimately contains \`\`\`mermaid fences inside JSON strings.
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
function runClaudeCli(prompt: string, timeoutMs = 120_000): Promise<string> {
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
 * Cogno's stateful brain. Keeps the collaboration as a running conversation —
 * every decision it makes becomes part of the history it sees next time, so
 * the agent has genuine memory of what it already wrote.
 */
export class CognoBrain {
  private readonly client: Anthropic | null;
  private readonly history: Turn[] = [];
  /** Keep the conversation bounded so token cost stays flat over a long session. */
  private static readonly MAX_HISTORY = 10;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    // A jsdom `window` is installed for TipTap, which makes the SDK think it's
    // a browser; this is a trusted local process, so opt in explicitly.
    this.client = apiKey
      ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
      : null; // cli mode — subscription via `claude -p`
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

    let text: string;
    try {
      text = this.client ? await this.thinkApi() : await this.thinkCli();
    } catch (err) {
      // Don't poison the history with a turn that got no answer.
      this.history.pop();
      throw err;
    }

    let parsed: { thought?: string; ops?: AgentOp[] };
    try {
      parsed = JSON.parse(this.client ? text : extractJson(text));
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

  private async thinkApi(): Promise<string> {
    const message = await this.client!.messages.create({
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
    // The CLI is stateless per call — replay the bounded conversation so the
    // brain keeps the same memory semantics as API mode.
    const transcript = this.history
      .map(t => (t.role === 'user' ? `[HUMAN TURN]\n${t.content}` : `[YOUR PAST DECISION]\n${t.content}`))
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

/** One-shot connectivity check — is Claude reachable in the active mode? */
export async function pingClaude(): Promise<string> {
  if (brainMode() === 'cli') {
    return (await runClaudeCli('Reply with exactly: pong', 60_000)).trim();
  }
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    dangerouslyAllowBrowser: true,
  });
  const message = await client.messages.create({
    model: brainModel(),
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
  });
  return textOf(message);
}
