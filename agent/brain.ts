import { spawn, spawnSync } from 'node:child_process';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, Type } from '@google/genai';
import type { BlockSnapshot } from './session';

/**
 * Cogno's thinking brain runs on one of three providers:
 *
 *   anthropic-api — ANTHROPIC_API_KEY → Anthropic SDK, structured outputs,
 *                   adaptive thinking, prompt caching. AGENT_MODEL
 *                   (default claude-opus-4-8). Production-ready.
 *   claude-cli    — the local `claude` CLI in headless print mode: the
 *                   developer's Claude subscription, no API key. AGENT_MODEL
 *                   (default "sonnet"). Local development only — servers
 *                   don't have a logged-in CLI.
 *   gemini        — GEMINI_API_KEY → Google Gemini with a response schema
 *                   (same key the Next.js /api/ai route uses). GEMINI_MODEL
 *                   (default gemini-2.5-flash). Production-ready.
 *
 * Selection: AGENT_BRAIN=claude|gemini forces a family; otherwise
 * ANTHROPIC_API_KEY > local claude CLI > GEMINI_API_KEY. All providers share
 * the same conversation memory semantics.
 */
export type BrainProvider = 'anthropic-api' | 'claude-cli' | 'gemini';

let cachedProvider: BrainProvider | null = null;

function hasClaudeCli(): boolean {
  try {
    return spawnSync('claude', ['--version'], { timeout: 8000 }).status === 0;
  } catch {
    return false;
  }
}

export function brainProvider(): BrainProvider {
  if (cachedProvider) return cachedProvider;
  const pref = (process.env.AGENT_BRAIN || '').toLowerCase();
  if (pref === 'gemini') {
    cachedProvider = 'gemini';
  } else if (pref === 'claude' || pref === 'anthropic') {
    cachedProvider = process.env.ANTHROPIC_API_KEY ? 'anthropic-api' : 'claude-cli';
  } else if (process.env.ANTHROPIC_API_KEY) {
    cachedProvider = 'anthropic-api';
  } else if (process.env.GEMINI_API_KEY) {
    // Single work loop = every round pays the brain's latency, so the default
    // prefers a spawn-free API over the (slower) local CLI. Force the
    // subscription CLI with AGENT_BRAIN=claude.
    cachedProvider = 'gemini';
  } else if (hasClaudeCli()) {
    cachedProvider = 'claude-cli';
  } else {
    cachedProvider = 'claude-cli'; // ping will fail with a clear error
  }
  return cachedProvider;
}

export function brainModel(): string {
  switch (brainProvider()) {
    case 'anthropic-api':
      return process.env.AGENT_MODEL || 'claude-opus-4-8';
    case 'claude-cli':
      return process.env.AGENT_MODEL || 'sonnet';
    case 'gemini':
      return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }
}


export type AgentAction = 'append_after' | 'replace' | 'delete' | 'generate_image';

export interface AgentOp {
  action: AgentAction;
  /** Target block. null + append_after/generate_image = end of document. */
  blockId: string | null;
  /** New content (markdown) for append_after / replace. */
  markdown?: string;
  /** Complete visual prompt for generate_image. */
  prompt?: string;
  /** Short alt text for generate_image. */
  alt?: string;
  /** Optional aspect ratio for generate_image, e.g. 16:9, 1:1, 4:3. */
  aspectRatio?: string;
  /** Optional generated image size, e.g. 1K or 2K. */
  imageSize?: string;
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
            enum: ['append_after', 'replace', 'delete', 'generate_image'],
          },
          blockId: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Target block id. null = end of document.',
          },
          markdown: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'New markdown for append_after / replace; null otherwise.',
          },
          prompt: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Complete visual prompt for generate_image; null otherwise.',
          },
          alt: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Short alt text for generate_image; null otherwise.',
          },
          aspectRatio: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Aspect ratio for generate_image: 1:1, 16:9, 9:16, 4:3, 3:4.',
          },
          imageSize: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Image size for generate_image: 512, 1K, 2K.',
          },
        },
        required: ['action', 'blockId', 'markdown', 'prompt', 'alt', 'aspectRatio', 'imageSize'],
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

/** Same decision shape as RESPONSE_SCHEMA, in Gemini's schema dialect. */
const GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    thought: { type: Type.STRING },
    ops: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ['append_after', 'replace', 'delete', 'generate_image'],
          },
          blockId: { type: Type.STRING, nullable: true },
          markdown: { type: Type.STRING, nullable: true },
          prompt: { type: Type.STRING, nullable: true },
          alt: { type: Type.STRING, nullable: true },
          aspectRatio: { type: Type.STRING, nullable: true },
          imageSize: { type: Type.STRING, nullable: true },
        },
        required: ['action'],
      },
    },
  },
  required: ['thought', 'ops'],
} as const;

const SYSTEM = `You are "Cogno AI", a realtime collaborator on a shared canvas document — a teammate with a visible cursor, not a chatbot. Humans see your caret move, your text being typed, your selections before deletions.

Context: this canvas is part of "Pillow", a realtime collaborative editor app (Next.js + TipTap + Y.js synced via a Hocuspocus WebSocket server; you are an AI client of that same server, thinking with Claude). When humans say "このアプリ" / "this app" they mean Pillow itself, not the Python imaging library.

You receive the document as an ordered list of blocks, each with a stable blockId. This is a LIVE, ongoing collaboration: you remember your own earlier contributions from this conversation, so build on them and never repeat yourself. Humans are often STILL TYPING when you're called — react to where they're heading, and NEVER touch the block they're actively editing (activeBlockId); work after/below it or elsewhere.

You run in a continuous work loop: another round follows IMMEDIATELY after this one. Do the most impactful 1-3 ops NOW with SHORT generated markdown — leave the rest for the next round, and return ops: [] once the work is complete. Scaffold early (a heading just appeared → skeleton below it), answer short questions in one line, start fulfilling instructions the moment their intent is clear (mid-sentence is fine).

Operations:
- append_after — insert new markdown after the block blockId (blockId null = end of document)
- replace — replace block blockId entirely with new markdown
- delete — remove block blockId
- generate_image — generate one image with the image tool and insert it after blockId (blockId null = end of document). Use when the human explicitly asks for an image/illustration/picture/画像/画面案, or is wondering how a UI/layout should look — then produce ONE polished concept image. The prompt must be a complete visual prompt (subject, style, composition, relevant document context); include concise alt text. NEVER invent image URLs or write markdown image links yourself.

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
  * BAR/LINE charts (棒グラフ・折れ線) — xychart-beta:
    xychart-beta
        title "タイトル"
        x-axis [Q1, Q2, Q3]
        y-axis "件数" 0 --> 100
        bar [20, 50, 80]
    (use "line [...]" for 折れ線; axis categories ASCII or short Japanese, no commas inside)
  * pie — pie title タイトル then lines like "項目A" : 40
  Tables (markdown |) are also welcome for comparisons. Never invent other embed types.
- To MODIFY an existing diagram, use replace on that mermaid block with the complete new \`\`\`mermaid fence, keeping unchanged lines byte-identical — only changed lines animate (parts of the diagram visibly erased/redrawn). Prefer editing an existing diagram over adding a second one about the same thing.
- HUMANS' WORDS ARE PROTECTED: delete or rewrite a human-written block ONLY when they explicitly asked for it (消して, まとめ直して, 英語にして, …). Fresh human text — including instructions they are still typing — must never be removed on your own judgment. Your own blocks and clearly-stale duplicates are fair game. Don't delete substance you merely disagree with.
- Ops apply strictly top-to-bottom; two append_after on the same blockId keep their order (the second lands after the first's content). Prefer ONE append_after containing all of your new content (prose AND fences together, in reading order) over multiple ops.
- NEVER open with filler acknowledgments ("承知しました", "わかりました", "Sure!", "説明します"). Start directly with the substance, like edits in a shared doc — not chat. No meta-commentary about being an AI.

You are the ORCHESTRATOR of the whole note, not a per-block responder. Every turn, zoom out before deciding:
- Does the note read as one coherent piece top-to-bottom (consistent language, tone, heading hierarchy, section order)?
- Do summaries/intros still match the sections below? Do diagrams still reflect the latest content? If content changed, update the dependent parts too — in the same turn (up to 5 ops).
- Are there unfulfilled requests ANYWHERE in the doc? Sweep them all, oldest first.
You also OWN the document's overall visual quality. When the doc has grown messy (stray fragments, empty-paragraph runs, inconsistent headings, redundant blocks), tidying it up IS a valuable contribution on its own — do it without being asked.

Direction following & self-revision:
- Infer the human's CURRENT direction from their newest writing — language, tone, structure — and pull the whole document toward it. If they start writing in a different language than the existing content, progressively translate existing blocks (including your own) via replace, a few blocks per turn, until the doc is consistent. EXCEPTION: mermaid/code blocks keep their existing labels/language unless explicitly asked.
- Your own earlier blocks are DRAFTS, not monuments: revise, merge, or delete them freely as the human's direction evolves. Prefer reworking your stale content over piling on new blocks.

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

function validateOps(raw: unknown, max = 3): AgentOp[] {
  const ops = Array.isArray((raw as { ops?: unknown })?.ops)
    ? ((raw as { ops: unknown[] }).ops as unknown[])
    : [];
  return ops
    .map((op): AgentOp | null => {
      if (!op || typeof op !== 'object') return null;
      const rawOp = op as Record<string, unknown>;
      const action = rawOp.action;
      if (
        action !== 'append_after' &&
        action !== 'replace' &&
        action !== 'delete' &&
        action !== 'generate_image'
      ) {
        return null;
      }
      const blockId = typeof rawOp.blockId === 'string' ? rawOp.blockId : null;
      if (action === 'delete') return { action, blockId };
      if (action === 'generate_image') {
        if (typeof rawOp.prompt !== 'string' || !rawOp.prompt.trim()) return null;
        return {
          action,
          blockId,
          prompt: rawOp.prompt.trim(),
          alt: typeof rawOp.alt === 'string' ? rawOp.alt.trim() : undefined,
          aspectRatio:
            typeof rawOp.aspectRatio === 'string' ? rawOp.aspectRatio.trim() : undefined,
          imageSize:
            typeof rawOp.imageSize === 'string' ? rawOp.imageSize.trim() : undefined,
        };
      }
      if (typeof rawOp.markdown !== 'string') return null;
      return { action, blockId, markdown: rawOp.markdown };
    })
    .filter((op): op is AgentOp => op !== null)
    .slice(0, max);
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
    ownBlockIds?: string[];
    /** Block the human is editing right now — untouchable. */
    activeBlockId?: string | null;
  }): Promise<BrainResult> {
    const userTurn = `Document blocks (top to bottom):

${renderBlocks(input.blocks)}

Blocks changed by humans since your last look: ${
      input.changedIds.length ? input.changedIds.join(', ') : '(unknown / first look)'
    }
activeBlockId (human is typing here — do not touch): ${input.activeBlockId ?? '(none)'}
Blocks YOU (Cogno) wrote earlier — drafts you may revise/delete: ${
      input.ownBlockIds?.length ? input.ownBlockIds.join(', ') : '(none yet)'
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
      // CLI replies may need loose extraction; both APIs return strict JSON.
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

    // Short rounds: ≤3 ops per turn — the work loop calls again immediately.
    return { thought: parsed.thought ?? '', ops: validateOps(parsed, 3) };
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

/**
 * The reflex brain: a single stateless, small-model call fired while the
 * human is still typing. Returns at most 2 tiny ops.
 */
/** One-shot connectivity check — is the configured brain reachable? */
export async function pingBrain(): Promise<string> {
  switch (brainProvider()) {
    case 'claude-cli':
      return (await runClaudeCli('Reply with exactly: pong', 60_000)).trim();
    case 'gemini': {
      if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await client.models.generateContent({
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
